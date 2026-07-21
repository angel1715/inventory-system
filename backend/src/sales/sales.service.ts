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

                await tx.inventoryMovement.create({
                    data: {
                        businessId,
                        productId: item.productId,
                        type: "SALE",
                        quantity: -item.quantity,
                        previousStock: prev,
                        newStock: newStock,
                        userId
                    }
                });
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
                },
            });

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
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
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
                items: { include: { product: true } },
            },
        });
    }

    // =========================================================================
    // MÉTODO AUXILIAR PARA CÁLCULO DE UTILIDAD
    // =========================================================================
    private calculateProfitForSale(sale: any, payments: any[]): number {
        const subtotal = Number(sale.subtotal || 0);
        const costoTotal = sale.items.reduce((c: number, item: any) =>
            c + (item.quantity * Number(item.product?.costPrice || 0)), 0);

        const margenTotalVenta = subtotal - costoTotal;
        const totalVenta = Number(sale.total || 0);

        if (sale.paymentMethod !== "CREDIT") return margenTotalVenta;

        const recaudadoEnRango = payments
            .filter(p => p.saleId === sale.id)
            .reduce((acc, p) => acc + Number(p.amount || 0), 0);

        const ratioCobrado = totalVenta > 0 ? (recaudadoEnRango / totalVenta) : 0;

        return margenTotalVenta * ratioCobrado;
    }

    private getPaidAmountForSale(sale: any, payments: any[]): number {
        return payments
            .filter(p => p.saleId === sale.id)
            .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    }

    // =========================================================================
    // DASHBOARD OPTIMIZADO - Lógica de Utilidad Real basada en Caja
    // =========================================================================
    async getDashboard(businessId: string, range: "today" | "week" | "month") {
        try {
            const dateFilter = this.getDateFilter(range);

            const [payments, expenses, totalDebtData] = await Promise.all([
                this.prisma.creditMovement.findMany({
                    where: { type: "PAYMENT", createdAt: dateFilter, creditAccount: { businessId } },
                    include: { sale: { include: { items: { include: { product: true } } } } }
                }),
                this.prisma.expense.findMany({ where: { businessId, createdAt: dateFilter } }),
                this.prisma.creditAccount.aggregate({ where: { businessId }, _sum: { currentDebt: true } }),
            ]);

            const salesInRange = await this.prisma.sale.findMany({
                where: { businessId, createdAt: dateFilter },
                include: {
                    items: { include: { product: true } },
                    serviceOrder: true   // ← Necesario para obtener laborCost
                }
            });

            const cashSales = salesInRange.filter(s => s.paymentMethod !== "CREDIT");
            let totalRealProfit = 0;

            for (const sale of cashSales) {
                const subtotal = Number(sale.subtotal || 0);
                const cost = sale.items.reduce((c, i) => c + (i.quantity * Number(i.product?.costPrice || 0)), 0);

                // ==========================================
                // NUEVO: RESTAR MANO DE OBRA DEL TÉCNICO
                // ==========================================
                const laborExpense = Number(sale.serviceOrder?.laborCost || 0);

                totalRealProfit += (subtotal - cost - laborExpense);
            }

            for (const payment of payments) {
                if (!payment.sale) continue;
                const sale = payment.sale;
                const subtotal = Number(sale.subtotal || 0);
                const cost = sale.items.reduce((c, i) => c + (i.quantity * Number(i.product?.costPrice || 0)), 0);
                const totalVenta = Number(sale.total || 0);
                const margenTotalVenta = subtotal - cost;
                const ratioCobrado = totalVenta > 0 ? (Number(payment.amount) / totalVenta) : 0;
                totalRealProfit += (margenTotalVenta * ratioCobrado);
            }

            const salesByDayMap = new Map<string, number>();

            cashSales.forEach(s => {
                const date = new Date(s.createdAt).toISOString().split('T')[0];
                salesByDayMap.set(date, (salesByDayMap.get(date) || 0) + Number(s.total));
            });
            payments.forEach(p => {
                const date = new Date(p.createdAt).toISOString().split('T')[0];
                salesByDayMap.set(date, (salesByDayMap.get(date) || 0) + Number(p.amount));
            });

            const salesByDay = Array.from(salesByDayMap.entries())
                .map(([date, total]) => ({ date, total }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const paymentMethodMap = new Map<string, number>();
            cashSales.forEach(s => {
                const method = s.paymentMethod || "CASH";
                paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + Number(s.total));
            });
            const totalRecaudado = payments.reduce((acc, p) => acc + Number(p.amount), 0);
            if (totalRecaudado > 0) {
                paymentMethodMap.set("RECAUDACIÓN", (paymentMethodMap.get("RECAUDACIÓN") || 0) + totalRecaudado);
            }
            const paymentMethods = Array.from(paymentMethodMap.entries())
                .map(([method, total]) => ({ method, total }));

            const totalCashIn = cashSales.reduce((acc, s) => acc + Number(s.total || 0), 0) + totalRecaudado;
            const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

            const allCreditSales = await this.prisma.sale.findMany({ where: { businessId, paymentMethod: "CREDIT" } });
            const allPayments = await this.prisma.creditMovement.findMany({ where: { type: "PAYMENT", creditAccount: { businessId } } });
            const totalCreditPending = allCreditSales.reduce((acc, s) => {
                const pagado = allPayments.filter(p => p.saleId === s.id).reduce((a, p) => a + Number(p.amount || 0), 0);
                return acc + Math.max(0, Number(s.total || 0) - pagado);
            }, 0);

            return {
                revenue: round(totalCashIn),
                expenses: round(totalExpenses),
                cashFlow: round(totalCashIn - totalExpenses),
                profit: round(totalRealProfit - totalExpenses),
                totalOrders: salesInRange.length,
                accountsReceivable: round(totalDebtData._sum.currentDebt || 0),
                creditPending: round(totalCreditPending),
                salesByDay,
                paymentMethods
            };
        } catch (error) {
            console.error("Error en getDashboard:", error);
            throw new InternalServerErrorException("Dashboard failed");
        }
    }

    // =========================================================================
    // DASHBOARD STATS (HEADER)
    // =========================================================================
    async getDashboardStats(businessId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const payments = await this.prisma.creditMovement.findMany({
            where: { type: "PAYMENT", createdAt: { gte: today }, creditAccount: { businessId } }
        });

        const sales = await this.prisma.sale.findMany({
            where: { businessId, createdAt: { gte: today } },
            include: {
                items: { include: { product: true } },
                serviceOrder: true
            }
        });

        const totalProfit = sales.reduce((acc, sale) => acc + this.calculateProfitForSale(sale, payments), 0);
        const cashSales = sales.filter(s => s.paymentMethod !== "CREDIT").reduce((acc, s) => acc + Number(s.total || 0), 0);
        const creditCollections = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

        return {
            revenue: round(cashSales + creditCollections),
            profit: round(totalProfit),
            salesCount: sales.length,
        };
    }
}