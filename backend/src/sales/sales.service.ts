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

interface CreateSaleInput extends CreateSaleDto {
    initialPayment?: number;
    customTotal?: number;
    serviceOrderId?: string;
}
type DateRange = "TODAY" | "WEEK" | "MONTH" | "ALL";

// B01 (papel) y E31 (electrónica) son Crédito Fiscal: la DGII exige el RNC del
// comprador para que el receptor pueda usarlo como crédito de ITBIS.
const RNC_REQUIRED_NCF_TYPES = ["B01", "E31"];

@Injectable()
export class SalesService {

    constructor(private prisma: PrismaService, private ecfService: EcfService) { }

    // =========================
    // DATE FILTER HELPER
    // =========================
    private getDateFilter(range: "today" | "week" | "month") {
        const start = new Date();
        if (range === "today") start.setHours(0, 0, 0, 0);
        else if (range === "week") start.setDate(start.getDate() - 7);
        else start.setMonth(start.getMonth() - 1);
        return { gte: start };
    }

    // ==========================================
    // CREATE SALE (CON SOPORTE PARA MANO DE OBRA)
    // ==========================================
    async createSale(dto: CreateSaleInput, userId: string, businessId: string) {
        if (!userId) throw new BadRequestException("Authenticated user not found");

        if (dto.ncfType && RNC_REQUIRED_NCF_TYPES.includes(dto.ncfType)) {
            if (!dto.customerId) {
                throw new BadRequestException("Los comprobantes de Crédito Fiscal requieren seleccionar un cliente con RNC registrado.");
            }
            const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, businessId } });
            if (!customer?.taxId) {
                throw new BadRequestException("El cliente seleccionado no tiene RNC registrado; es obligatorio para Crédito Fiscal.");
            }
        }

        const idempotencyKey = dto.idempotencyKey ?? randomUUID();
        const initialPayment = round(dto.initialPayment || 0);

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

            // ==========================================
            // NUEVO: VALIDAR ORDEN DE REPARACIÓN Y MANO DE OBRA
            // ==========================================
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

            // Recorrido de los items de productos/repuestos
            for (const item of dto.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId, businessId } });
                if (!product) throw new NotFoundException("Producto no encontrado.");
                subtotal += item.quantity * Number(item.salePrice);
                costTotal += item.quantity * Number(product.costPrice);
            }

            // ==========================================
            // AJUSTE: INCLUIR MANO DE OBRA EN EL TOTAL
            // ==========================================
            const totalSubtotalWithLabor = subtotal + repairLaborCost;
            const originalTotal = round(totalSubtotalWithLabor * (1 + taxRate / 100));
            const customTotal = Math.min(round(dto.customTotal || originalTotal), originalTotal);

            // Validamos que el total cubra tanto el costo de los productos como la mano de obra del técnico
            if (customTotal < (costTotal + repairLaborCost)) {
                throw new BadRequestException("El total de la venta es menor al costo de piezas y mano de obra.");
            }

           

            let ncf: string | null = null;
            let ncfSequenceId: string | null = null;

            if (useNcf && dto.ncfType) {
                const generated = await generateAndConsumeNcf(
                    tx,
                    businessId,
                    dto.ncfType
                );
                ncf = generated.ncf;
                ncfSequenceId = generated.ncfSequenceId;
            }

            const subtotalAmount = useTax
                ? round(customTotal / (1 + taxRate / 100))
                : customTotal;

            const taxAmount = useTax
                ? round(customTotal - subtotalAmount)
                : 0;

            const sale = await tx.sale.create({
                data: {
                    invoiceNumber: `INV-${Date.now()}`,
                    idempotencyKey,

                    ncf,
                    ncfType: useNcf ? dto.ncfType ?? null : null,
                    ncfSequenceId,

                    subtotal: subtotalAmount,
                    tax: taxAmount,
                    total: customTotal,
                    discount: round(originalTotal - customTotal),

                    paymentMethod: dto.paymentMethod as PaymentMethod,

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
                        })),
                    },
                },

                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                        },
                    },

                    customer: true,
                    serviceOrder: true,

                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });;

             // ==========================================
            // ACTUALIZACIÓN DE INVENTARIO
            // ==========================================
            for (const item of dto.items) {
                const p = await tx.product.findUnique({
                    where: { id: item.productId, businessId }
                });

                if (!p) throw new NotFoundException(`Producto ${item.productId} no encontrado`);

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

                // Determinamos si el movimiento viene de una orden de reparación o de una venta normal del POS
                const isRepairSale = Boolean(dto.serviceOrderId);

               await tx.inventoryMovement.create({
                    data: {
                        businessId,
                        productId: item.productId,
                        type: "SALE", // Usamos el enum permitido por tu base de datos
                        quantity: -item.quantity,
                        previousStock: prev, // ¡Nunca más saldrá en "-"!
                        newStock: newStock,   // ¡Nunca más saldrá en "-"!
                        userId,
                        note: isRepairSale 
                            ? `Pieza usada en Orden de Reparación #${dto.serviceOrderId} (Factura #${sale.invoiceNumber})`
                            : `Venta POS - Factura #${sale.invoiceNumber}`
                    }
                });
            }

            if (dto.serviceOrderId) {
                await tx.serviceLog.create({
                    data: {
                        serviceOrderId: dto.serviceOrderId,
                        statusFrom: ServiceStatus.REPAIRED,
                        statusTo: ServiceStatus.REPAIRED,
                        note: `Reparación facturada. Factura ${sale.invoiceNumber}`,
                        userId,
                        action: "INVOICE",
                    },
                });
            }

            if (dto.paymentMethod === "CREDIT" && dto.customerId) {
                let creditAccount = await tx.creditAccount.upsert({
                    where: { customerId: dto.customerId },
                    update: {},
                    create: { customerId: dto.customerId, businessId }
                });

                await tx.accountsReceivable.create({
                    data: {
                        saleId: sale.id,
                        customerId: dto.customerId,
                        originalAmount: customTotal,
                        paidAmount: initialPayment,
                        pendingAmount: round(customTotal - initialPayment),
                        status: initialPayment >= customTotal ? "PAID" : "PARTIAL",
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        createdById: userId
                    }
                });

                await tx.creditAccount.update({
                    where: { id: creditAccount.id },
                    data: { currentDebt: { increment: customTotal } }
                });

                await tx.creditMovement.create({
                    data: {
                        creditAccountId: creditAccount.id,
                        type: "CHARGE",
                        amount: customTotal,
                        saleId: sale.id,
                        currentDebtSnapshot: round(Number(creditAccount.currentDebt) + customTotal)
                    }
                });

                if (initialPayment > 0) {
                    await tx.creditMovement.create({
                        data: {
                            creditAccountId: creditAccount.id,
                            type: "PAYMENT",
                            amount: initialPayment,
                            saleId: sale.id,
                            note: `Abono inicial Factura #${sale.invoiceNumber}`,
                            currentDebtSnapshot: round(customTotal - initialPayment),
                            cashSessionId: session.id
                        }
                    });
                    await tx.cashMovement.create({
                        data: {
                            cashSessionId: session.id,
                            type: "INCOME",
                            amount: initialPayment,
                            description: `Abono inicial Factura #${sale.invoiceNumber}`,
                            userId
                        }
                    });
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
                        description: `Venta ${dto.paymentMethod} #${sale.invoiceNumber}`,
                        userId
                    }
                });
            }

            return sale;
        }, { isolationLevel: "Serializable" });

        // ==========================================
        // ENVIO A DGII (e-CF) - fuera de la transacción: una llamada externa nunca
        // debe mantener abierta una transacción Serializable. La venta local ya
        // quedó confirmada; un fallo del conector no debe revertirla ni fallar
        // la respuesta al usuario (EcfService ya persiste ecfStatus:'failure').
        // ==========================================
        if (sale.ncfType?.startsWith("E")) {
            try {
                await this.ecfService.sendSaleInvoice(businessId, sale.id);
            } catch {
                // Swallow: ya quedó registrado el fallo en el Sale por EcfService.
            }
        }

        return this.prisma.sale.findUnique({
            where: { id: sale.id },
            include: {
                createdBy: {
                    select: { id: true, name: true, role: true },
                },
                items: {
                    include: {
                        product: true,
                        // Agrega esto si tus items guardan la relación directa con el serial vendido:
                        // itemSerial: true, 
                    },
                },
                serviceOrder: true, // <-- Vital para extraer la mano de obra en el recibo
                customer: true,
            },
        });
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

            const where: Prisma.SaleWhereInput = {
                businessId,
                ...(paymentMethod !== "ALL" ? { paymentMethod: paymentMethod as PaymentMethod } : {}),
                ...(dateRange !== "ALL" ? { createdAt: this.getDateFilter(dateRange as any) } : {}),
                ...(search.trim() ? {
                    OR: [
                        { invoiceNumber: { contains: search, mode: 'insensitive' } },
                        { ncf: { contains: search, mode: 'insensitive' } },
                        { createdBy: { name: { contains: search, mode: 'insensitive' } } }
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
                serviceOrder: true, // <-- Incluir aquí también
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
                        technician: { select: { id: true, name: true } } // Opcional: técnico que reparó
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
    // MÉTODO UNIFICADO Y PROFESIONAL DE CÁLCULO DE UTILIDAD
    // =========================================================================
    private calculateProfitForSale(sale: any, paymentsInRange: any[] = []): number {
        const subtotalNeto = Number(sale.subtotal || 0);

        // 1. Costo total de los productos/repuestos físicos despachados
        const productCost = sale.items.reduce((acc: number, item: any) => {
            const unitCost = Number(item.product?.costPrice || item.costPriceSnapshot || 0);
            return acc + (item.quantity * unitCost);
        }, 0);

        // 2. Costo de la mano de obra del técnico (si viene de una orden de reparación)
        const laborCost = Number(sale.serviceOrder?.laborCost || 0);

        // Utilidad bruta potencial de esta factura específica
        const grossProfit = subtotalNeto - productCost - laborCost;

        // 3. Ajuste por ventas a crédito (Criterio de Caja)
        if (sale.paymentMethod === "CREDIT") {
            const totalVenta = Number(sale.total || 0);
            if (totalVenta <= 0) return 0;

            // Sumamos los abonos que se hicieron a esta venta específica dentro del periodo evaluado
            const collectedForThisSale = paymentsInRange
                .filter(p => p.saleId === sale.id)
                .reduce((acc, p) => acc + Number(p.amount || 0), 0);

            // La utilidad se realiza de manera proporcional a lo cobrado
            const collectionRatio = collectedForThisSale / totalVenta;
            return grossProfit * collectionRatio;
        }

        // Si es venta al contado, la utilidad se reconoce de inmediato
        return grossProfit;
    }

    private getPaidAmountForSale(sale: any, payments: any[]): number {
        return payments
            .filter(p => p.saleId === sale.id)
            .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    }

    async getMetrics(businessId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Consultar ventas del periodo con relaciones financieras clave
    const sales = await this.prisma.sale.findMany({
        where: {
            businessId,
            createdAt: { gte: start, lte: end },
        },
        include: {
            items: { include: { product: true } },
            serviceOrder: true,
            accountsReceivable: true, // Necesario para aislar el abono inicial
        },
    });

    // 2. Consultar abonos de créditos realizados en este periodo exacto
    const periodPayments = await this.prisma.creditMovement.findMany({
        where: {
            creditAccount: { businessId },
            type: 'PAYMENT',
            createdAt: { gte: start, lte: end },
        },
    });

    let totalGrossSales = 0;
    let totalCogs = 0;
    let totalLaborCost = 0;
    let initialCashCollected = 0;
    let creditIssued = 0;

    for (const sale of sales) {
        const saleTotal = Number(sale.total || 0);
        totalGrossSales += saleTotal;

        // Costo de mercancía vendida (COGS)
        for (const item of sale.items) {
            const itemCost = Number(item.product?.costPrice || 0);
            totalCogs += itemCost * item.quantity;
        }

        // Costo de mano de obra (si aplica)
        if (sale.serviceOrder) {
            totalLaborCost += Number(sale.serviceOrder.laborCost || 0);
        }

        // Lógica de entrada de dinero real por tipo de pago
        if (sale.paymentMethod !== 'CREDIT') {
            initialCashCollected += saleTotal; // Contado o transferencia entra el 100%
        } else {
            creditIssued += saleTotal; // Se registra la deuda generada
            // Solo entra a la caja el abono inicial configurado en la cuenta por cobrar
            const initialPayment = sale.accountsReceivable ? Number(sale.accountsReceivable.paidAmount || 0) : 0;
            initialCashCollected += initialPayment;
        }
    }

    // Total de abonos posteriores cobrados en el rango
    const totalPaymentsCollected = periodPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    // Flujo de efectivo total real que entró a caja en el periodo
    const totalCashInflow = initialCashCollected + totalPaymentsCollected;

    return {
        totalGrossSales,     // Facturación comercial total
        totalCashInflow,     // Dinero real en caja (Contado + Abonos iniciales + Abonos posteriores)
        creditIssued,        // Deuda total acumulada generada
        totalPaymentsCollected, // Abonos recuperados de créditos
        totalCogs,
        totalLaborCost,
    };
}
    // =========================================================================
    // DASHBOARD OPTIMIZADO - Lógica de Utilidad Real basada en Caja
    // =========================================================================
    async getDashboard(businessId: string, startDate?: string, endDate?: string) {
    // Configuración del rango de fechas
    const dateFilter: any = {};
    if (startDate && endDate) {
        dateFilter.gte = new Date(startDate);
        dateFilter.lte = new Date(endDate);
    }

    // 1. Consultar ventas en el rango incluyendo la cuenta por cobrar (para el abono inicial)
    const salesInRange = await this.prisma.sale.findMany({
        where: { businessId, createdAt: dateFilter },
        include: {
            items: { include: { product: true } },
            serviceOrder: true,
            accountsReceivable: true, // Crucial para extraer el paidAmount inicial
        },
    });

    // 2. Consultar los abonos posteriores realizados en el rango (movimientos de crédito tipo PAYMENT)
    const payments = await this.prisma.creditMovement.findMany({
        where: {
            creditAccount: { businessId },
            type: 'PAYMENT',
            createdAt: dateFilter,
        },
    });

    // Separar ventas de contado y de crédito
    const cashSales = salesInRange.filter(s => s.paymentMethod !== 'CREDIT');
    const creditSalesInRange = salesInRange.filter(s => s.paymentMethod === 'CREDIT');

    // Cálculos de ingresos reales de caja
    const totalCashSales = cashSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    
    // Abono inicial aportado el mismo día de la venta a crédito
    const totalInitialPayments = creditSalesInRange.reduce((acc, s) => {
        const paidInitial = s.accountsReceivable ? Number(s.accountsReceivable.paidAmount || 0) : 0;
        return acc + paidInitial;
    }, 0);

    // Abonos posteriores recibidos en cuentas por cobrar
    const totalRecaudado = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    // Flujo de caja real total en el periodo
    const totalCashIn = totalCashSales + totalInitialPayments + totalRecaudado;

    // Total facturado comercial (para referencia global)
    const totalGrossSales = salesInRange.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const totalCreditIssued = creditSalesInRange.reduce((acc, s) => acc + Number(s.total || 0), 0);

    // Mapa de distribución de ingresos por día para gráficas
    const salesByDayMap = new Map<string, number>();

    cashSales.forEach(s => {
        const date = new Date(s.createdAt).toISOString().split('T')[0];
        salesByDayMap.set(date, (salesByDayMap.get(date) || 0) + Number(s.total || 0));
    });

    creditSalesInRange.forEach(s => {
        const date = new Date(s.createdAt).toISOString().split('T')[0];
        const initial = s.accountsReceivable ? Number(s.accountsReceivable.paidAmount || 0) : 0;
        if (initial > 0) {
            salesByDayMap.set(date, (salesByDayMap.get(date) || 0) + initial);
        }
    });

    payments.forEach(p => {
        const date = new Date(p.createdAt).toISOString().split('T')[0];
        salesByDayMap.set(date, (salesByDayMap.get(date) || 0) + Number(p.amount || 0));
    });

    const salesByDay = Array.from(salesByDayMap.entries()).map(([date, total]) => ({
        date,
        total,
    }));

    return {
        totalGrossSales,
        totalCashIn,
        totalCreditIssued,
        totalCreditCollected: totalRecaudado,
        salesByDay,
        salesCount: salesInRange.length,
    };
}

    // =========================================================================
    // DASHBOARD STATS (HEADER)
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

        const payments = await this.prisma.creditMovement.findMany({
            where: { type: "PAYMENT", createdAt: { gte: startDate }, creditAccount: { businessId } }
        });

        const sales = await this.prisma.sale.findMany({
            where: { businessId, createdAt: { gte: startDate } },
            include: {
                items: { include: { product: true } },
                serviceOrder: true
            }
        });

        const totalProfit = sales.reduce((acc, sale) => acc + this.calculateProfitForSale(sale, payments), 0);
        const cashSales = sales.filter(s => s.paymentMethod !== "CREDIT").reduce((acc, s) => acc + Number(s.total || 0), 0);
        const creditCollections = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

        // --- LÓGICA PARA EL TOP DE PRODUCTOS MÁS VENDIDOS ---
        const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>();

        for (const sale of sales) {
            for (const item of sale.items) {
                const productName = item.product?.name || "Artículo sin nombre";
                const quantity = Number(item.quantity || 0);
                const itemRevenue = Number(item.lineTotal || (quantity * Number(item.salePrice || 0)));

                if (productMap.has(productName)) {
                    const current = productMap.get(productName)!;
                    current.totalSold += quantity;
                    current.revenue += itemRevenue;
                } else {
                    productMap.set(productName, {
                        name: productName,
                        totalSold: quantity,
                        revenue: itemRevenue,
                    });
                }
            }
        }

        const topProducts = Array.from(productMap.values())
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5);

        return {
            revenue: round(cashSales + creditCollections),
            profit: round(totalProfit),
            salesCount: sales.length,
            topProducts: topProducts.map(p => ({
                ...p,
                revenue: round(p.revenue)
            })),
        };
    }
}