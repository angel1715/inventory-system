import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentMethod } from "@prisma/client";

@Injectable()
export class CashService {
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // OPEN REGISTER
    // ==========================================
    async openRegister(businessId: string, userId: string, openingAmount: number) {
        if (openingAmount < 0) {
            throw new BadRequestException("El monto de apertura no puede ser negativo.");
        }

        const existing = await this.prisma.cashSession.findFirst({
            where: { businessId, status: "OPEN" },
        });

        if (existing) {
            throw new BadRequestException("Ya existe una sesión de caja abierta para este negocio.");
        }

        return this.prisma.cashSession.create({
            data: {
                businessId,
                userId,
                openingAmount,
                status: "OPEN",
                openedAt: new Date(),
            },
        });
    }

    // ==========================================
    // SUMMARY (Única fuente de verdad para el dinero)
    // ==========================================
    async getSummary(businessId: string) {
        const session = await this.prisma.cashSession.findFirst({
            where: { businessId, status: "OPEN" },
            include: {
                user: { select: { name: true } },
            },
        });

        if (!session) return null;

        // 1. Agrupar ventas (Usando Number() para asegurar precisión aritmética simple)
        const sales = await this.prisma.sale.groupBy({
            by: ["paymentMethod"],
            where: { cashSessionId: session.id },
            _sum: { total: true },
        });

        // 2. Sumar gastos
        const expensesSum = await this.prisma.expense.aggregate({
            where: { cashSessionId: session.id },
            _sum: { amount: true },
        });
        const totalExpenses = Number(expensesSum._sum.amount ?? 0);

        // 3. Sumar abonos a créditos
        const creditPaymentsSum = await this.prisma.creditMovement.aggregate({
            where: {
                cashSessionId: session.id,
                type: "PAYMENT",
            },
            _sum: { amount: true },
        });
        const totalCreditPayments = Number(creditPaymentsSum._sum.amount ?? 0);

        // 4. Mapeo de ventas
        const summary: Record<PaymentMethod, number> = {
            CASH: 0,
            CARD: 0,
            TRANSFER: 0,
            CREDIT: 0,
        };

        for (const s of sales) {
            summary[s.paymentMethod] = Number(s._sum.total ?? 0);
        }

        // 5. CÁLCULO EXACTO
        // Convertimos openingAmount a número explícitamente para evitar conflictos con Decimal.js
        const opening = Number(session.openingAmount);

        const expectedCash = opening + summary.CASH + totalCreditPayments - totalExpenses;

        // 6. Resto del objeto
        const expectedDigital = summary.CARD + summary.TRANSFER;
        const totalRevenue = summary.CASH + summary.CARD + summary.TRANSFER + summary.CREDIT;

        return {
            sessionId: session.id,
            status: session.status,
            openedAt: session.openedAt,
            openedBy: session.user?.name || "Usuario",
            openingAmount: opening,
            cashSales: summary.CASH,
            cardSales: summary.CARD,
            transferSales: summary.TRANSFER,
            creditSales: summary.CREDIT,
            totalExpenses,
            totalCreditPayments,
            expectedDigital,
            expectedCash,
            totalRevenue,
        };
    }

    // ==========================================
    // CLOSE REGISTER - BLINDADO Y AUDITADO
    // ==========================================
    async closeRegister(
        businessId: string,
        userId: string,
        actualCash: number,
        note?: string // Nueva justificación obligatoria si hay diferencia
    ) {
        if (actualCash < 0) {
            throw new BadRequestException("El monto físico de cierre no es válido.");
        }

        return this.prisma.$transaction(
            async (tx) => {
                const summary = await this.getSummary(businessId);

                if (!summary) {
                    throw new BadRequestException("No se encontró ninguna sesión de caja abierta.");
                }

                const difference = actualCash - summary.expectedCash;

                // Blindaje: Si hay diferencia, es obligatorio justificar
                // Usamos un pequeño margen de tolerancia (0.01) para evitar falsos positivos por decimales
                if (Math.abs(difference) > 0.01 && (!note || note.trim().length < 5)) {
                    throw new BadRequestException(
                        "El monto físico no coincide con el esperado. Por favor, proporcione una justificación válida."
                    );
                }

                // Cerramos la sesión y guardamos la justificación
                const closedSession = await tx.cashSession.update({
                    where: { id: summary.sessionId },
                    data: {
                        status: "CLOSED",
                        actualCash,
                        expectedCash: summary.expectedCash,
                        difference,
                        closedAt: new Date(),
                    },
                });

                // Registro de auditoría para el historial del dueño
                if (Math.abs(difference) > 0.01) {
                    await tx.auditLog.create({
                        data: {
                            action: "CASH_DIFFERENCE",
                            entity: "CASH_SESSION",
                            entityId: closedSession.id,
                            description: `Descuadre de ${difference}. Justificación: ${note}`,
                            userId,
                            businessId
                        }
                    });
                }

                return closedSession;
            },
            { isolationLevel: "Serializable" }
        );
    }

    // ==========================================
    // CURRENT SESSION
    // ==========================================
    async getCurrentSession(businessId: string) {
        return this.prisma.cashSession.findFirst({
            where: { businessId, status: "OPEN" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    // ==========================================
    // HISTORY
    // ==========================================
    async getHistory(businessId: string) {
        return this.prisma.cashSession.findMany({
            where: { businessId },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { openedAt: "desc" },
        });
    }
}