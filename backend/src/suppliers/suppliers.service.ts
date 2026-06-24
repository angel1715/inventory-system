import {
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import { CreateSupplierDto } from "./dto/create-supplier.dto";

@Injectable()
export class SuppliersService {

    constructor(
        private prisma: PrismaService,
    ) { }

    // =========================
    // CREATE
    // =========================
    async create(
        dto: CreateSupplierDto,
        businessId: string,
    ) {

        return this.prisma.supplier.create({
            data: {
                ...dto,
                businessId,
            },
        });
    }

    // =========================
    // FIND ALL
    // =========================
    async findAll(
        businessId: string,
    ) {

        return this.prisma.supplier.findMany({
            where: {
                businessId,
            },

            orderBy: {
                createdAt: "desc",
            },
        });
    }

    // =========================
    // FIND ONE
    // =========================
    async findOne(
        id: string,
        businessId: string,
    ) {

        const supplier =
            await this.prisma.supplier.findFirst({
                where: {
                    id,
                    businessId,
                },
            });

        if (!supplier) {
            throw new NotFoundException(
                "Supplier not found",
            );
        }

        return supplier;
    }

    // =========================
    // UPDATE
    // =========================
    async update(
        id: string,
        dto: CreateSupplierDto,
        businessId: string,
    ) {

        await this.findOne(
            id,
            businessId,
        );

        return this.prisma.supplier.update({
            where: {
                id,
            },

            data: dto,
        });
    }

    // =========================
    // DELETE
    // =========================
    async remove(
        id: string,
        businessId: string,
    ) {

        await this.findOne(
            id,
            businessId,
        );

        return this.prisma.supplier.delete({
            where: {
                id,
            },
        });
    }
}

