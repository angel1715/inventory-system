import {
    Injectable,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class InventoryService {

    constructor(private prisma: PrismaService) { }

    async getMovements(businessId: string, page = 1, limit = 10, search = "") {
        const skip = (page - 1) * limit;
        const normalizedSearch = search.trim();

        // Blindaje: Solo traer movimientos de este negocio
        const where: Prisma.InventoryMovementWhereInput = {
            businessId, 
            ...(normalizedSearch && {
                OR: [
                    { product: { name: { contains: normalizedSearch, mode: Prisma.QueryMode.insensitive } } },
                    { note: { contains: normalizedSearch, mode: Prisma.QueryMode.insensitive } },
                ],
            })
        };

        const [movements, total] = await Promise.all([
            this.prisma.inventoryMovement.findMany({
                skip,
                take: limit,
                where,
                include: { product: true, user: true },
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.inventoryMovement.count({ where }),
        ]);

        return {
            data: movements,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async restockProduct(productId: string, quantity: number, userId: string, businessId: string, note?: string) {
        return this.prisma.$transaction(async (tx) => {
            // Blindaje: El producto DEBE pertenecer a este negocio
            const product = await tx.product.findUnique({ where: { id: productId, businessId } });
            if (!product) throw new NotFoundException("Producto no encontrado o no pertenece a este negocio");

            const previousStock = product.stock;
            const updated = await tx.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } },
            });

            await tx.inventoryMovement.create({
                data: {
                    businessId, // Registro de auditoría con tenant
                    productId,
                    type: "RESTOCK",
                    quantity,
                    previousStock,
                    newStock: updated.stock,
                    note: note || "Manual restock",
                    userId,
                },
            });

            return updated;
        }, { isolationLevel: "Serializable" });
    }

    async writeOffProduct(productId: string, quantity: number, userId: string, businessId: string, reason: string) {
        return this.prisma.$transaction(async (tx) => {
            // Blindaje: El producto DEBE pertenecer a este negocio
            const product = await tx.product.findUnique({ where: { id: productId, businessId } });
            if (!product) throw new NotFoundException("Producto no encontrado o no pertenece a este negocio");

            if (product.stock < quantity) {
                throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}`);
            }

            const previousStock = product.stock;
            const updated = await tx.product.update({
                where: { id: productId },
                data: { stock: { decrement: quantity } },
            });

            await tx.inventoryMovement.create({
                data: {
                    businessId, // Registro de auditoría con tenant
                    productId,
                    type: "ADJUSTMENT",
                    quantity: -quantity,
                    previousStock,
                    newStock: updated.stock,
                    note: `WRITE-OFF: ${reason}`,
                    userId,
                },
            });

            return updated;
        }, { isolationLevel: "Serializable" });
    }
}