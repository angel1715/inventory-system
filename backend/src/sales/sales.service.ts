import {
    Injectable,
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { Prisma, PaymentMethod, ServiceStatus } from "@prisma/client";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { randomUUID } from "crypto";
import { generateAndConsumeNcf } from "../common/ncf.util";
import { EcfService } from "../ecf/ecf.service";

const round = (num: number | Prisma.Decimal): number => Math.round(Number(num) * 100) / 100;

const userSelect = {
    id: true,
    name: true,
    email: true,
};

// Relaciones que devuelve createSale (y que se reutilizan en la respuesta idempotente)
const saleInclude = {
    createdBy: { select: { id: true, name: true, role: true } },
    customer: true,
    serviceOrder: true,
    items: { include: { product: true } },
} as const;

interface CreateSaleInput extends CreateSaleDto {
    initialPayment?: number;
    customTotal?: number;
    serviceOrderId?: string;
}

// B01 (papel) y E31 (electrónica) son Crédito Fiscal: la DGII exige el RNC del
// comprador para que el receptor pueda usarlo como crédito de ITBIS.
const RNC_REQUIRED_NCF_TYPES = ["B01", "E31"];

@Injectable()
export class SalesService {

    constructor(private prisma: PrismaService, private ecfService: EcfService) { }

    // =========================================================================
    // HELPERS
    // =========================================================================

    // Filtro de fechas para el listado de ventas
    private getDateFilter(range: "today" | "week" | "month") {
        const start = new Date();
        if (range === "today") start.setHours(0, 0, 0, 0);
        else if (range === "week") start.setDate(start.getDate() - 7);
        else start.setMonth(start.getMonth() - 1);
        return { gte: start };
    }

    // Rango de fechas único para dashboard y métricas (evita descuadres entre tarjetas)
    private getRangeFilter(startDate?: string, endDate?: string) {
        if (startDate && endDate) {
            return { gte: new Date(startDate), lte: new Date(endDate) };
        }
        const now = new Date();
        return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: now };
    }

    // Fecha YYYY-MM-DD en hora de RD (no UTC), para agrupar por día
    private localDay(d: Date | string) {
        return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" });
    }

    // COGS de una venta: snapshot histórico, con respaldo al costo actual
    private calculateCogs(sale: any): number {
        return sale.items.reduce((acc: number, item: any) => {
            const unitCost = Number(item.costPriceSnapshot ?? item.product?.costPrice ?? 0);
            return acc + Number(item.quantity || 0) * unitCost;
        }, 0);
    }

    // Utilidad completa de una venta (subtotal sin ITBIS - costo - mano de obra)
    private saleFullProfit(sale: any): number {
        const net = Number(sale.subtotal || sale.total || 0);
        return net - this.calculateCogs(sale) - Number(sale.serviceOrder?.laborCost || 0);
    }

    // Top 5 de productos/servicios más vendidos
    private buildTopProducts(sales: any[]) {
        const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>();

        for (const sale of sales) {
            for (const item of sale.items) {
                const name = item.product?.name || "Artículo sin nombre";
                const qty = Number(item.quantity || 0);
                const rev = Number(item.lineTotal || qty * Number(item.salePrice || 0));
                const cur = productMap.get(name) ?? { name, totalSold: 0, revenue: 0 };
                cur.totalSold += qty;
                cur.revenue += rev;
                productMap.set(name, cur);
            }
        }

        return Array.from(productMap.values())
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5)
            .map((p) => ({ ...p, revenue: round(p.revenue) }));
    }

    // Cálculo por criterio de caja: ventas de contado completas + abonos de crédito proporcionales
    private async computeCashBasis(
        businessId: string,
        dateFilter: { gte: Date; lte: Date },
    ) {
        const include = {
            items: { include: { product: true } },
            serviceOrder: true,
        } as const;

        const [cashSales, payments] = await Promise.all([
            this.prisma.sale.findMany({
                where: { businessId, createdAt: dateFilter, paymentMethod: { not: PaymentMethod.CREDIT } },
                include,
            }),
            this.prisma.creditMovement.findMany({
                where: { creditAccount: { businessId }, type: "PAYMENT", createdAt: dateFilter },
            }),
        ]);

        // Abonos del periodo agrupados por venta (incluye el abono inicial)
        const paidBySale = new Map<string, number>();
        let unallocated = 0;
        for (const p of payments) {
            const amount = Number(p.amount || 0);
            if (p.saleId) paidBySale.set(p.saleId, (paidBySale.get(p.saleId) || 0) + amount);
            else unallocated += amount;
        }

        // Las ventas a crédito pueden ser de periodos anteriores, así que se buscan por id
        const creditSales = paidBySale.size
            ? await this.prisma.sale.findMany({
                where: { businessId, id: { in: [...paidBySale.keys()] } },
                include,
            })
            : [];

        let grossSales = 0, cogs = 0, laborCost = 0, profit = 0;

        for (const s of cashSales) {
            grossSales += Number(s.total || 0);
            cogs += this.calculateCogs(s);
            laborCost += Number(s.serviceOrder?.laborCost || 0);
            profit += this.saleFullProfit(s);
        }

        for (const s of creditSales) {
            const total = Number(s.total || 0);
            if (total <= 0) continue;
            const paid = paidBySale.get(s.id) || 0;
            const ratio = Math.min(paid / total, 1);

            grossSales += paid;
            cogs += this.calculateCogs(s) * ratio;
            laborCost += Number(s.serviceOrder?.laborCost || 0) * ratio;
            profit += this.saleFullProfit(s) * ratio;
        }

        grossSales += unallocated; // abonos sin venta asociada: cuentan como ingreso, sin costo

        return {
            grossSales: round(grossSales),
            cogs: round(cogs),
            laborCost: round(laborCost),
            profit: round(profit),
            collected: round(payments.reduce((a, p) => a + Number(p.amount || 0), 0)),
        };
    }

    // ==========================================
    // CREATE SALE (CON SOPORTE PARA MANO DE OBRA)
    // ==========================================
    async createSale(dto: CreateSaleInput, userId: string, businessId: string) {
        if (!userId) throw new BadRequestException("Authenticated user not found");

        // --- Validaciones básicas de entrada ---
        if (!dto.items?.length) {
            throw new BadRequestException("La venta debe tener al menos un artículo.");
        }
        for (const item of dto.items) {
            const qty = Number(item.quantity);
            if (!Number.isInteger(qty) || qty <= 0) {
                throw new BadRequestException("La cantidad de cada artículo debe ser un entero mayor a cero.");
            }
            if (Number(item.salePrice) < 0) {
                throw new BadRequestException("El precio de venta no puede ser negativo.");
            }
        }
        if (!Object.values(PaymentMethod).includes(dto.paymentMethod as PaymentMethod)) {
            throw new BadRequestException("Método de pago inválido.");
        }

        if (dto.ncfType && RNC_REQUIRED_NCF_TYPES.includes(dto.ncfType)) {
            if (!dto.customerId) {
                throw new BadRequestException("Los comprobantes de Crédito Fiscal requieren seleccionar un cliente con RNC registrado.");
            }
            const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, businessId } });
            if (!customer?.taxId) {
                throw new BadRequestException("El cliente seleccionado no tiene RNC registrado; es obligatorio para Crédito Fiscal.");
            }
        }

        const isCreditSale = dto.paymentMethod === "CREDIT";
        const initialPayment = round(dto.initialPayment || 0);

        if (isCreditSale && !dto.customerId) {
            throw new BadRequestException("Las ventas a crédito requieren seleccionar un cliente.");
        }
        if (initialPayment < 0) {
            throw new BadRequestException("El abono inicial no puede ser negativo.");
        }

        // --- Idempotencia: si ya se procesó esta venta, devolvemos la existente ---
        if (dto.idempotencyKey) {
            const existing = await this.prisma.sale.findFirst({
                where: { businessId, idempotencyKey: dto.idempotencyKey },
                include: saleInclude,
            });
            if (existing) return existing;
        }
        const idempotencyKey = dto.idempotencyKey ?? randomUUID();

        const sale = await this.prisma.$transaction(async (tx) => {
            const session = await tx.cashSession.findFirst({ where: { status: "OPEN", businessId } });
            if (!session) throw new BadRequestException("No hay sesión abierta.");

            let subtotal = 0, costTotal = 0;
            const settings = await tx.businessSettings.findFirst({
                where: { businessId },
            });

            const useTax = settings?.useItbis ?? false;
            const useNcf = settings?.useNcf ?? false;
            const taxRate = useTax ? settings?.taxRate ?? 18 : 0;

            let repairLaborCost = 0;

            if (dto.serviceOrderId) {
                const serviceOrder = await tx.serviceOrder.findFirst({
                    where: { id: dto.serviceOrderId, businessId },
                    include: { sale: true },
                });

                if (!serviceOrder) throw new NotFoundException("Orden de reparación no encontrada.");
                if (serviceOrder.sale) throw new BadRequestException("Esta reparación ya fue facturada.");

                if (
                    serviceOrder.status !== ServiceStatus.REPAIRED &&
                    serviceOrder.status !== ServiceStatus.READY_FOR_PICKUP
                ) {
                    throw new BadRequestException("Solo las órdenes reparadas o listas para retirar pueden ser facturadas.");
                }

                repairLaborCost = Number(serviceOrder.laborCost || 0);
            }

            // Costo histórico de cada producto (se guarda como snapshot en el ítem)
            const costByProduct = new Map<string, number>();

            for (const item of dto.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId, businessId } });
                if (!product) throw new NotFoundException("Producto no encontrado.");
                subtotal += item.quantity * Number(item.salePrice);
                costTotal += item.quantity * Number(product.costPrice);
                costByProduct.set(item.productId, Number(product.costPrice));
            }

            const totalSubtotalWithLabor = subtotal + repairLaborCost;
            const originalTotal = round(totalSubtotalWithLabor * (1 + taxRate / 100));
            const customTotal = Math.min(round(dto.customTotal || originalTotal), originalTotal);

            if (initialPayment > customTotal) {
                throw new BadRequestException("El abono inicial no puede superar el total de la venta.");
            }

            if (customTotal < (costTotal + repairLaborCost)) {
                throw new BadRequestException("El total de la venta es menor al costo de piezas y mano de obra.");
            }

            let ncf: string | null = null;
            let ncfSequenceId: string | null = null;

            if (useNcf && dto.ncfType) {
                const generated = await generateAndConsumeNcf(tx, businessId, dto.ncfType);
                ncf = generated.ncf;
                ncfSequenceId = generated.ncfSequenceId;
            }

            const subtotalAmount = useTax
                ? round(customTotal / (1 + taxRate / 100))
                : customTotal;

            const taxAmount = useTax
                ? round(customTotal - subtotalAmount)
                : 0;

            // Número de factura único por negocio (sufijo aleatorio evita choques en el mismo milisegundo)
            const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0")}`;

            // 1. Creación de la Venta
            const createdSale = await tx.sale.create({
                data: {
                    invoiceNumber,
                    idempotencyKey,
                    ncf,
                    ncfType: useNcf ? dto.ncfType ?? null : null,
                    ncfSequenceId,
                    subtotal: subtotalAmount,
                    tax: taxAmount,
                    total: customTotal,
                    discount: round(originalTotal - customTotal),
                    paymentMethod: dto.paymentMethod as PaymentMethod,
                    isCreditSale,
                    cashSessionId: session.id,
                    createdById: userId,
                    businessId,
                    customerId: dto.customerId ?? null,
                    serviceOrderId: dto.serviceOrderId ?? null,
                    
                    items: {
                        create: dto.items.map((i) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            salePrice: i.salePrice,
                            lineTotal: round(i.quantity * i.salePrice),
                            serialNumber: i.serialNumber || null,
                            costPriceSnapshot: costByProduct.get(i.productId) ?? 0,
                        })),
                    },
                },
                include: saleInclude,
            });

            // 2. Actualización de Inventario y Movimientos
            for (const item of dto.items) {
                const p = await tx.product.findUnique({
                    where: { id: item.productId, businessId }
                });

                if (!p) throw new NotFoundException(`Producto ${item.productId} no encontrado`);

                if (p.stock < item.quantity) {
                    throw new BadRequestException(`Stock insuficiente para "${p.name}" (disponible: ${p.stock}).`);
                }

                const prev = p.stock;
                const newStock = prev - item.quantity;

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity },
                        status: newStock === 0 ? "SOLD" : "AVAILABLE"
                    }
                });

                if (item.serialNumber) {
                    const updateResult = await tx.itemSerial.updateMany({
                        where: {
                            serial: item.serialNumber,
                            productId: item.productId,
                            isSold: false
                        },
                        data: { isSold: true }
                    });

                    if (updateResult.count === 0) {
                        throw new BadRequestException(`El serial/IMEI ${item.serialNumber} no está disponible o ya fue vendido.`);
                    }
                }

                const isRepairSale = Boolean(dto.serviceOrderId);

                await tx.inventoryMovement.create({
                    data: {
                        businessId,
                        productId: item.productId,
                        type: "SALE",
                        quantity: -item.quantity,
                        previousStock: prev,
                        newStock: newStock,
                        userId,
                        note: isRepairSale
                            ? `Pieza usada en Orden de Reparación #${dto.serviceOrderId} (Factura #${createdSale.invoiceNumber})`
                            : `Venta POS - Factura #${createdSale.invoiceNumber}`
                    }
                });
            }

            if (dto.serviceOrderId) {
                await tx.serviceLog.create({
                    data: {
                        serviceOrderId: dto.serviceOrderId,
                        statusFrom: ServiceStatus.REPAIRED,
                        statusTo: ServiceStatus.REPAIRED,
                        note: `Reparación facturada. Factura ${createdSale.invoiceNumber}`,
                        userId,
                        action: "INVOICE",
                    },
                });
            }

            // 3. Manejo de Crédito / Cuentas por Cobrar
            if (isCreditSale && dto.customerId) {
                const creditAccount = await tx.creditAccount.upsert({
                    where: { customerId: dto.customerId },
                    update: {},
                    create: { customerId: dto.customerId, businessId, currentDebt: 0 }
                });

                const previousDebt = Number(creditAccount.currentDebt || 0);
                const newDebtSnapshot = round(previousDebt + customTotal);

                // Límite de crédito (maxCredit = 0 se interpreta como "sin límite")
                const maxCredit = Number(creditAccount.maxCredit || 0);
                if (maxCredit > 0 && round(previousDebt + customTotal - initialPayment) > maxCredit) {
                    throw new BadRequestException("La venta supera el límite de crédito del cliente.");
                }

                const receivableStatus =
                    initialPayment >= customTotal ? "PAID" : initialPayment > 0 ? "PARTIAL" : "PENDING";

                await tx.accountsReceivable.create({
                    data: {
                        saleId: createdSale.id,
                        customerId: dto.customerId,
                        originalAmount: customTotal,
                        paidAmount: initialPayment,
                        pendingAmount: round(customTotal - initialPayment),
                        status: receivableStatus,
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        createdById: userId
                    }
                });

                // Incrementamos la deuda total del cliente con el valor de la venta
                await tx.creditAccount.update({
                    where: { id: creditAccount.id },
                    data: { currentDebt: { increment: customTotal } }
                });

                // Movimiento de tipo CHARGE (cargo por la factura)
                await tx.creditMovement.create({
                    data: {
                        creditAccountId: creditAccount.id,
                        type: "CHARGE",
                        amount: customTotal,
                        saleId: createdSale.id,
                        currentDebtSnapshot: newDebtSnapshot
                    }
                });

                // Si hubo un abono inicial al momento de crear el crédito
                if (initialPayment > 0) {
                    const debtAfterInitialPayment = round(newDebtSnapshot - initialPayment);

                    await tx.creditMovement.create({
                        data: {
                            creditAccountId: creditAccount.id,
                            type: "PAYMENT",
                            amount: initialPayment,
                            saleId: createdSale.id,
                            note: `Abono inicial Factura #${createdSale.invoiceNumber}`,
                            currentDebtSnapshot: debtAfterInitialPayment,
                            cashSessionId: session.id
                        }
                    });

                    await tx.cashMovement.create({
                        data: {
                            cashSessionId: session.id,
                            type: "INCOME",
                            amount: initialPayment,
                            description: `Abono inicial Factura #${createdSale.invoiceNumber}`,
                            userId
                        }
                    });

                    // Descontamos el abono de la cuenta del cliente
                    await tx.creditAccount.update({
                        where: { id: creditAccount.id },
                        data: { currentDebt: { decrement: initialPayment } }
                    });
                }
            } else {
                await tx.cashMovement.create({
                    data: {
                        cashSessionId: session.id,
                        type: "INCOME",
                        amount: customTotal,
                        description: `Venta ${dto.paymentMethod} #${createdSale.invoiceNumber}`,
                        userId
                    }
                });
            }

            return createdSale;
        }, { isolationLevel: "Serializable" });

        // 4. Envío a DGII (e-CF) fuera de transacción
        if (sale.ncfType?.startsWith("E")) {
            try {
                await this.ecfService.sendSaleInvoice(businessId, sale.id);
            } catch (err) {
                // No se interrumpe la venta, pero se deja registro del fallo
                console.error(`Fallo el envío e-CF de la venta ${sale.id}:`, err);
            }
        }

        return sale;
    }

    // =========================
    // OBTENER TODAS LAS VENTAS (LISTADO)
    // =========================
    async findAll(
        businessId: string,
        page: number,
        limit: number,
        search: string,
        paymentMethod: string,
        dateRange: string
    ) {
        try {
            const skip = (page - 1) * limit;
            const term = (search ?? "").trim();

            const where: Prisma.SaleWhereInput = {
                businessId,
                ...(paymentMethod !== "ALL" ? { paymentMethod: paymentMethod as PaymentMethod } : {}),
                ...(dateRange !== "ALL" ? { createdAt: this.getDateFilter(dateRange as any) } : {}),
                ...(term ? {
                    OR: [
                        { invoiceNumber: { contains: term, mode: 'insensitive' } },
                        { ncf: { contains: term, mode: 'insensitive' } },
                        { createdBy: { name: { contains: term, mode: 'insensitive' } } }
                    ]
                } : {})
            };

            const [data, total] = await Promise.all([
                this.prisma.sale.findMany({
                    where,
                    skip,
                    take: limit,
                                        include: {
                        createdBy: { select: userSelect },
                        customer: true,
                        serviceOrder: {
                            omit: { password: true },
                            include: {
                                technician: { select: { id: true, name: true } },
                            },
                        },
                        items: {
                            include: {
                                product: { select: { id: true, name: true, barcode: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                }),
                this.prisma.sale.count({ where })
            ]);

            return {
                data,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error: any) {
            console.error("Error en findAll:", error);
            throw new InternalServerErrorException(error?.message || "Error al obtener las ventas");
        }
    }

    async exportAll(businessId: string, paymentMethod: string, dateRange: string) {
        const where: Prisma.SaleWhereInput = {
            businessId,
            ...(paymentMethod !== "ALL" ? { paymentMethod: paymentMethod as any } : {}),
            ...(dateRange !== "ALL" ? { createdAt: this.getDateFilter(dateRange as any) } : {}),
        };

        return this.prisma.sale.findMany({
            where,
            include: {
                createdBy: { select: { name: true } },
                items: {
                    include: {
                        product: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    // =========================
    // BUSCAR UNA VENTA SINGLE
    // =========================
    async findOne(id: string, businessId: string) {
        return this.prisma.sale.findFirst({
            where: { id, businessId },
            include: {
                createdBy: { select: userSelect },
                items: {
                    include: {
                        product: { select: { id: true, name: true, barcode: true } },
                    },
                },
                serviceOrder: true,
            },
        });
    }

    // =========================
    // OBTENER FACTURA DIGITAL
    // =========================
    async getInvoice(id: string, businessId: string) {
        return this.prisma.sale.findFirst({
            where: { id, businessId },
            include: {
                createdBy: { select: userSelect },
                customer: true, // Datos del cliente (Nombre, RNC, Teléfono)
                serviceOrder: {
                    include: {
                        items: {
                            include: {
                                product: true // Repuestos usados en el taller
                            }
                        },
                        technician: { select: { id: true, name: true } } // Técnico que reparó
                    }
                },
                items: {
                    include: {
                        product: true // Productos vendidos en la línea de venta
                    }
                },
            },
        });
    }

    // =========================================================================
    // MÉTRICAS FINANCIERAS (criterio de caja)
    // =========================================================================
    async getMetrics(businessId: string, startDate?: string, endDate?: string) {
        const dateFilter = this.getRangeFilter(startDate, endDate);

        const [basis, creditAgg] = await Promise.all([
            this.computeCashBasis(businessId, dateFilter),
            this.prisma.sale.aggregate({
                where: { businessId, createdAt: dateFilter, paymentMethod: PaymentMethod.CREDIT },
                _sum: { total: true },
            }),
        ]);

        const profitMargin = basis.grossSales > 0 ? (basis.profit / basis.grossSales) * 100 : 0;

        return {
            revenue: { grossSales: basis.grossSales },
            costs: { cogs: basis.cogs, laborCost: basis.laborCost },
            profitability: { grossProfit: basis.profit, profitMargin: round(profitMargin) },
            creditIssued: round(Number(creditAgg._sum.total || 0)),
            totalPaymentsCollected: basis.collected,
        };
    }

    // =========================================================================
    // DASHBOARD
    // =========================================================================
    async getDashboard(businessId: string, startDate?: string, endDate?: string) {
        const dateFilter = this.getRangeFilter(startDate, endDate);

        const basis = await this.computeCashBasis(businessId, dateFilter);

        const [salesInRange, payments, receivableAgg, expenseAgg] = await Promise.all([
            this.prisma.sale.findMany({
                where: { businessId, createdAt: dateFilter },
                include: {
                    items: { include: { product: true } },
                    serviceOrder: true,
                    accountsReceivable: true,
                },
            }),
            this.prisma.creditMovement.findMany({
                where: { creditAccount: { businessId }, type: "PAYMENT", createdAt: dateFilter },
            }),
            // Total pendiente de cobro (todas las ventas a crédito no saldadas, sin importar el rango)
            this.prisma.accountsReceivable.aggregate({
                where: { sale: { businessId }, status: { not: "PAID" } },
                _sum: { pendingAmount: true },
            }),
            // Gastos operativos del periodo
            this.prisma.expense.aggregate({
                where: { businessId, createdAt: dateFilter },
                _sum: { amount: true },
            }),
        ]);

        const cashSales = salesInRange.filter((s) => s.paymentMethod !== "CREDIT");
        const creditSales = salesInRange.filter((s) => s.paymentMethod === "CREDIT");

        const totalCashSales = cashSales.reduce((a, s) => a + Number(s.total || 0), 0);
        const totalCollected = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
        const totalCreditIssued = creditSales.reduce((a, s) => a + Number(s.total || 0), 0);

        // Crédito de este periodo que sigue sin cobrarse
        const creditPending = creditSales.reduce(
            (a, s) => a + Number(s.accountsReceivable?.pendingAmount ?? s.total ?? 0), 0
        );

        // Ventas por día (hora de RD)
        const byDay = new Map<string, number>();
        const add = (d: Date, amount: number) => {
            const key = this.localDay(d);
            byDay.set(key, (byDay.get(key) || 0) + amount);
        };
        cashSales.forEach((s) => add(s.createdAt, Number(s.total || 0)));
        payments.forEach((p) => add(p.createdAt, Number(p.amount || 0)));
        const salesByDay = Array.from(byDay.entries())
            .map(([date, total]) => ({ date, total: round(total) }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Métodos de pago reales
        const byMethod = new Map<string, number>();
        salesInRange.forEach((s) =>
            byMethod.set(s.paymentMethod, (byMethod.get(s.paymentMethod) || 0) + Number(s.total || 0))
        );
        const paymentMethods = Array.from(byMethod.entries()).map(([method, total]) => ({
            method,
            total: round(total),
        }));

        return {
            revenue: basis.grossSales,
            cashFlow: round(totalCashSales + totalCollected),
            profit: basis.profit,
            accountsReceivable: round(Number(receivableAgg._sum.pendingAmount || 0)),
            creditPending: round(creditPending),
            totalOrders: salesInRange.length,
            totalGrossSales: basis.grossSales,
            totalCreditIssued: round(totalCreditIssued),
            totalCreditCollected: round(totalCollected),
            salesByDay,
            salesCount: salesInRange.length,
            paymentMethods,
            topProducts: this.buildTopProducts(salesInRange),
            expenses: round(Number(expenseAgg._sum.amount || 0)),
        };
    }

    // =========================================================================
    // DASHBOARD STATS (versión resumida; usa el mismo criterio de caja)
    // =========================================================================
    async getDashboardStats(businessId: string, range: string = 'today') {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        // Ajustar la fecha de inicio según el rango recibido
        if (range === '7days') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (range === 'month') {
            startDate.setDate(1); // Inicio del mes actual
        } else if (range === 'year') {
            startDate.setMonth(0, 1); // Inicio del año actual
        }

        const dateFilter = { gte: startDate, lte: new Date() };

        const [basis, sales] = await Promise.all([
            this.computeCashBasis(businessId, dateFilter),
            this.prisma.sale.findMany({
                where: { businessId, createdAt: dateFilter },
                include: { items: { include: { product: true } } },
            }),
        ]);

        return {
            revenue: basis.grossSales,
            profit: basis.profit,
            salesCount: sales.length,
            topProducts: this.buildTopProducts(sales),
        };
    }
}