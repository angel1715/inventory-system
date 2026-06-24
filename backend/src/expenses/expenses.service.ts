import {
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService }
    from "../prisma/prisma.service";

import { CreateExpenseDto }
    from "./dto/create-expense.dto";

@Injectable()
export class ExpensesService {
    constructor(
        private prisma: PrismaService,
    ) { }

    // ======================
    // CREATE EXPENSE
    // ======================
    async create(
        dto: CreateExpenseDto,
        businessId: string,
    ) {
        // 1. Buscamos si hay una sesión de caja abierta en este negocio
        const activeSession = await this.prisma.cashSession.findFirst({
            where: {
                businessId,
                status: "OPEN",
            },
        });

        // 2. Creamos el gasto. Si hay sesión abierta, le atamos el ID; si no, queda en null.
        // Nota: Eliminamos el 'as any' para mantener el tipado fuerte de Prisma
        return this.prisma.expense.create({
            data: {
                title: dto.title,
                description: dto.description,
                amount: dto.amount,
                category: dto.category,
                businessId,
                // Si tu modelo tiene la relación con cashSession, se guarda aquí:
                cashSessionId: activeSession ? activeSession.id : null,
            },
        });
    }

    // ======================
    // GET ALL EXPENSES
    // ======================
    async findAll(
        businessId: string,
    ) {

        return this.prisma.expense.findMany({
            where: {
                businessId,
            },

            orderBy: {
                createdAt: "desc",
            },
        });
    }

    // ======================
    // GET ONE EXPENSE
    // ======================
    async findOne(
        id: string,
        businessId: string,
    ) {

        const expense =
            await this.prisma.expense.findFirst({
                where: {
                    id,
                    businessId,
                },
            });

        if (!expense) {
            throw new NotFoundException(
                "Expense not found",
            );
        }

        return expense;
    }

    // ======================
    // DELETE EXPENSE
    // ======================
    async remove(
        id: string,
        businessId: string,
    ) {

        await this.findOne(
            id,
            businessId,
        );

        await this.prisma.expense.deleteMany({
            where: {
                id,
                businessId,
            },
        });

        return {
            message:
                "Expense deleted successfully",
        };
    }
}

