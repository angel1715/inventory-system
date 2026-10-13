import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

const SERIALIZED_MESSAGE =
    "Este producto se controla por IMEI/serial: su existencia cambia con las compras y las ventas, no por cantidad.";

@Injectable()
export class InventoryService {

    constructor(private prisma: PrismaService) { }

    async getMovements(businessId: string, page = 1, limit = 10, search = "") {
        const skip = (page - 1) * limit;
        const normalizedSearch = search.trim();

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
                include: {
                    product: { select: { id: true, name: true, sku: true, barcode: true } },
                    // Nunca "user: true": devolvería el hash de la contraseña
                    user: { select: { id: true, name: true, email: true } },
                },
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
            const product = await tx.product.findUnique({ where: { id: productId, businessId } });
            if (!product) throw new NotFoundException("Producto no encontrado o no pertenece a este negocio");

            if (product.isSerialized) throw new BadRequestException(SERIALIZED_MESSAGE);

            const previousStock = product.stock;
            const updated = await tx.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity }, status: "AVAILABLE" },
            });

            await tx.inventoryMovement.create({
                data: {
                    businessId,
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
            const product = await tx.product.findUnique({ where: { id: productId, businessId } });
            if (!product) throw new NotFoundException("Producto no encontrado o no pertenece a este negocio");

            if (product.isSerialized) throw new BadRequestException(SERIALIZED_MESSAGE);

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
                    businessId,
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