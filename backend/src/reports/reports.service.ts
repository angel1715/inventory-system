import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    // Resumen histórico (todas las ventas del negocio). La base de datos hace las sumas:
    // antes se cargaban todas las ventas con sus líneas y productos en memoria.
    async getOverview(businessId: string) {
        const [
            salesAgg,
            cogsRows,
            laborAgg,
            receivableAgg,
            products,
            suppliers,
            lowStock,
        ] = await Promise.all([
            this.prisma.sale.aggregate({
                where: { businessId },
                _sum: { subtotal: true, total: true },
                _count: { _all: true },
            }),

            // Costo de lo vendido: el costo guardado en cada línea al momento de la venta
            // (si una línea vieja no lo tiene, se usa el costo actual del producto)
            this.prisma.$queryRaw<{ cogs: number }[]>(Prisma.sql`
                SELECT COALESCE(SUM(si."quantity" * COALESCE(si."costPriceSnapshot", p."costPrice")), 0)::float8 AS cogs
                FROM "SaleItem" si
                JOIN "Sale" s ON s."id" = si."saleId"
                JOIN "Product" p ON p."id" = si."productId"
                WHERE s."businessId" = ${businessId}
            `),

            // Mano de obra de las reparaciones facturadas (igual que el dashboard)
            this.prisma.serviceOrder.aggregate({
                where: { businessId, sale: { isNot: null } },
                _sum: { laborCost: true },
            }),

            // Lo que aún no se ha cobrado de las ventas a crédito
            this.prisma.accountsReceivable.aggregate({
                where: { sale: { businessId }, status: { not: "PAID" } },
                _sum: { pendingAmount: true },
            }),

            this.prisma.product.count({ where: { businessId } }),
            this.prisma.supplier.count({ where: { businessId } }),

            // Bajo stock: se compara stock con stock mínimo directamente en la base de datos
            this.prisma.product.count({
                where: {
                    businessId,
                    active: true,
                    stock: { lte: this.prisma.product.fields.minStock },
                },
            }),
        ]);

        // Ingreso sin ITBIS: el impuesto no es ganancia del negocio
        const revenue = Number(salesAgg._sum.subtotal ?? 0);
        const grossSales = Number(salesAgg._sum.total ?? 0);
        const cogs = Number(cogsRows[0]?.cogs ?? 0);
        const laborCost = Number(laborAgg._sum.laborCost ?? 0);

        const profit = revenue - cogs - laborCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
            revenue: round2(revenue),
            grossSales: round2(grossSales),
            tax: round2(grossSales - revenue),
            cogs: round2(cogs),
            laborCost: round2(laborCost),
            profit: round2(profit),
            margin: round2(margin),
            salesCount: salesAgg._count._all,
            accountsReceivable: round2(Number(receivableAgg._sum.pendingAmount ?? 0)),
            products,
            suppliers,
            lowStock,
        };
    }
}