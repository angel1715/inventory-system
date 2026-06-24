import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
    constructor(
        private prisma: PrismaService
    ) { }

    async getDashboard() {
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        // =========================
        // SALES
        // =========================

        const sales = await this.prisma.sale.findMany({
            include: {
                createdBy: true,

                items: {
                    include: {
                        product: true,
                    },
                },
            },

            orderBy: {
                createdAt: "desc",
            },
        });

        // =========================
        // TODAY SALES
        // =========================

        const todaySales = sales.filter(
            (sale) => new Date(sale.createdAt) >= today
        );

        // =========================
        // TOTAL REVENUE
        // =========================

        const totalSales = sales.reduce(
            (acc, sale) => acc + Number(sale.total),
            0
        );

        // =========================
        // TODAY REVENUE
        // =========================

        const todayRevenue = todaySales.reduce(
            (acc, sale) => acc + Number(sale.total),
            0
        );

        // =========================
        // TOTAL ORDERS
        // =========================

        const totalOrders = sales.length;

        // =========================
        // TOP PRODUCTS
        // =========================

        const topProductsMap: any = {};

        sales.forEach((sale) => {
            sale.items.forEach((item) => {
                if (!topProductsMap[item.product.name]) {
                    topProductsMap[item.product.name] = 0;
                }

                topProductsMap[item.product.name] += item.quantity;
            });
        });

        const topProducts = Object.entries(topProductsMap)
            .map(([name, quantity]) => ({
                name,
                quantity,
            }))
            .sort((a: any, b: any) => b.quantity - a.quantity)
            .slice(0, 5);

        // =========================
        // PAYMENT METHODS
        // =========================

        const paymentMap: any = {};

        sales.forEach((sale) => {
            if (!paymentMap[sale.paymentMethod]) {
                paymentMap[sale.paymentMethod] = 0;
            }

            paymentMap[sale.paymentMethod] += Number(sale.total);
        });

        const paymentMethods = Object.entries(paymentMap).map(
            ([method, total]) => ({
                method,
                total,
            })
        );

        // =========================
        // SALES TREND
        // =========================

        const salesByDayMap: any = {};

        sales.forEach((sale) => {
            const day = new Date(sale.createdAt).toLocaleDateString();

            if (!salesByDayMap[day]) {
                salesByDayMap[day] = 0;
            }

            salesByDayMap[day] += Number(sale.total);
        });

        const salesByDay = Object.entries(salesByDayMap).map(
            ([date, total]) => ({
                date,
                total,
            })
        );

        // =========================
        // LOW STOCK PRODUCTS
        // =========================

        const lowStockProducts =
            await this.prisma.product.findMany({
                where: {
                    stock: {
                        lte: 5,
                    },
                },

                orderBy: {
                    stock: "asc",
                },
            });

        // =========================
        // RECENT SALES
        // =========================

        const recentSales =
            await this.prisma.sale.findMany({
                include: {
                    createdBy: true,
                },

                orderBy: {
                    createdAt: "desc",
                },

                take: 5,
            });

        // =========================
        // COST OF GOODS SOLD
        // =========================

        let totalCost = 0;

        sales.forEach((sale) => {
            sale.items.forEach((item) => {
                totalCost +=
                    Number(item.product.costPrice) * item.quantity;
            });
        });

        // =========================
        // EXPENSES
        // =========================

        const expenses =
            await this.prisma.expense.findMany();

        const totalExpenses = expenses.reduce(
            (acc, e) => acc + Number(e.amount),
            0
        );

        // =========================
        // PROFIT
        // =========================

        const grossProfit =
            totalSales - totalCost;

        const netProfit =
            grossProfit - totalExpenses;

        // =========================
        // RETURN
        // =========================

        return {
            totalSales,
            todayRevenue,
            totalOrders,
            topProducts,
            paymentMethods,
            salesByDay,
            lowStockProducts,
            recentSales,
            totalCost,
            totalExpenses,
            grossProfit,
            netProfit,
        };
    }

    // =========================
    // SUMMARY
    // =========================

    async summary() {
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        // =========================
        // TODAY SALES
        // =========================

        const salesToday =
            await this.prisma.sale.aggregate({
                where: {
                    createdAt: {
                        gte: today,
                    },
                },

                _sum: {
                    total: true,
                },

                _count: true,
            });

        // =========================
        // LOW STOCK COUNT
        // =========================

        const lowStock =
            await this.prisma.product.count({
                where: {
                    stock: {
                        lte: 10,
                    },
                },
            });

        // =========================
        // INVENTORY VALUE
        // =========================

        const products =
            await this.prisma.product.findMany();

        let inventoryValue = 0;

        products.forEach((p: any) => {
            inventoryValue +=
                Number(p.costPrice) * p.stock;
        });

        // =========================
        // CASH STATUS
        // =========================

        const cashOpen =
            await this.prisma.cashSession.findFirst({
                where: {
                    status: "OPEN",
                },
            });

        // =========================
        // RECENT SALES
        // =========================

        const recentSales =
            await this.prisma.sale.findMany({
                include: {
                    createdBy: true,
                },

                orderBy: {
                    createdAt: "desc",
                },

                take: 5,
            });

        // =========================
        // RETURN
        // =========================

        return {
            salesToday: Number(
                salesToday._sum.total || 0
            ),

            transactionsToday:
                salesToday._count,

            productsLowStock:
                lowStock,

            inventoryValue,

            cashOpen: !!cashOpen,

            recentSales,
        };
    }

    // =========================
    // DASHBOARD STATS
    // =========================

    async getDashboardStats() {
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        // =========================
        // SALES TODAY
        // =========================

        const salesToday =
            await this.prisma.sale.findMany({
                where: {
                    createdAt: {
                        gte: today,
                    },
                },

                include: {
                    createdBy: true,

                    items: true,
                },

                orderBy: {
                    createdAt: "desc",
                },

                take: 5,
            });

        // =========================
        // TOTAL REVENUE
        // =========================

        const revenue =
            await this.prisma.sale.aggregate({
                where: {
                    createdAt: {
                        gte: today,
                    },
                },

                _sum: {
                    total: true,
                },
            });

        // =========================
        // PRODUCTS SOLD
        // =========================

        const itemsSold =
            await this.prisma.saleItem.aggregate({
                _sum: {
                    quantity: true,
                },

                where: {
                    sale: {
                        createdAt: {
                            gte: today,
                        },
                    },
                },
            });

        // =========================
        // PAYMENT METHODS
        // =========================

        const payments =
            await this.prisma.sale.groupBy({
                by: ["paymentMethod"],

                where: {
                    createdAt: {
                        gte: today,
                    },
                },

                _sum: {
                    total: true,
                },
            });

        return {
            revenue:
                Number(revenue._sum.total || 0),

            productsSold:
                Number(itemsSold._sum.quantity || 0),

            salesCount:
                salesToday.length,

            latestSales:
                salesToday,

            payments,
        };
    }
}