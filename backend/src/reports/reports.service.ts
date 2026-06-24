import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
    constructor(
        private prisma: PrismaService,
    ) { }

    async getOverview(businessId: string) {

        const sales =
            await this.prisma.sale.findMany({
                where: {
                    businessId,
                },

                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

        let revenue = 0;
        let cogs = 0;

        for (const sale of sales) {

            revenue += Number(sale.total);

            for (const item of sale.items) {

                cogs +=
                    item.quantity *
                    Number(item.product.costPrice);
            }
        }

        const profit =
            revenue - cogs;

        const margin =
            revenue > 0
                ? (profit / revenue) * 100
                : 0;

        // =========================
        // PRODUCTS
        // =========================

        const products =
            await this.prisma.product.count({
                where: {
                    businessId,
                },
            });

        // =========================
        // SUPPLIERS
        // =========================

        const suppliers =
            await this.prisma.supplier.count({
                where: {
                    businessId,
                },
            });

        // =========================
        // LOW STOCK
        // =========================

        const productsList =
            await this.prisma.product.findMany({
                where: {
                    businessId,
                    active: true,
                },

                select: {
                    stock: true,
                    minStock: true,
                },
            });

        const lowStock =
            productsList.filter(
                p => p.stock <= p.minStock,
            ).length;

            

        return {
            revenue,
            cogs,
            profit,

            margin:
                Number(
                    margin.toFixed(2),
                ),

            salesCount:
                sales.length,

            products,
            suppliers,
            lowStock,
        };
    }



}
