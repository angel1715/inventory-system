import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";

@Injectable()
export class PurchasesService {
    constructor(private prisma: PrismaService) { }

    // =========================
    // CREATE PURCHASE
    // =========================
    // ... dentro de PurchasesService
    // =========================
    // CREATE PURCHASE - BLINDADO
    // =========================
    // =========================
    // CREATE PURCHASE - BLINDADO
    // =========================
    async create(dto: CreatePurchaseDto, businessId: string, userId: string) {
        if (!dto.items?.length) throw new BadRequestException("Purchase items are required");

        try {
            return await this.prisma.$transaction(async (tx) => {
                // 1. VALIDAR PROVEEDOR
                const supplier = await tx.supplier.findFirst({ where: { id: dto.supplierId, businessId } });
                if (!supplier) throw new BadRequestException("Supplier not found");

                let total = 0;
                const processedItems: { item: any; product: any; itemTotal: number }[] = [];

                for (const item of dto.items) {
                    const product = await tx.product.findFirst({
                        where: { id: item.productId, businessId },
                    });

                    if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

                    // VALIDACIÓN IMEI/SERIADOS
                    if (product.isSerialized) {
                        if (!item.serials || item.serials.length !== item.quantity) {
                            throw new BadRequestException(`Product '${product.name}' requires exactly ${item.quantity} serials.`);
                        }
                        const existingSerials = await tx.itemSerial.findMany({
                            where: { serial: { in: item.serials }, productId: product.id },
                            select: { serial: true }
                        });

                        if (existingSerials.length > 0) {
                            const serialsList = existingSerials.map(s => s.serial).join(', ');
                            throw new BadRequestException(`Conflicto de IMEI: Los siguientes números ya existen: ${serialsList}`);
                        }
                    }

                    const itemTotal = Number(item.quantity) * Number(item.costPrice);
                    total += itemTotal;
                    processedItems.push({ item, product, itemTotal });
                }

                // 3. CABECERA
                const purchase = await tx.purchase.create({
                    data: {
                        invoiceNumber: `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        supplierId: dto.supplierId,
                        total,
                        businessId,
                        status: "COMPLETED",
                    },
                });

                // 4. PROCESAR LÍNEAS
                for (const { item, product, itemTotal } of processedItems) {
                    const purchaseItem = await tx.purchaseItem.create({
                        data: {
                            purchaseId: purchase.id,
                            productId: item.productId,
                            quantity: item.quantity,
                            costPrice: item.costPrice,
                            total: itemTotal,
                        },
                    });

                    // Seriales
                    if (product.isSerialized) {
                        await tx.itemSerial.createMany({
                            data: item.serials.map((serial: string) => ({
                                serial, productId: product.id, purchaseItemId: purchaseItem.id, isSold: false
                            }))
                        });
                    }

                    // Lotes
                    if (product.hasExpiry && item.batch) {
                        await tx.productBatch.create({
                            data: {
                                batchNumber: item.batch.batchNumber,
                                expiryDate: new Date(item.batch.expiryDate),
                                initialQuantity: item.quantity,
                                currentQuantity: item.quantity,
                                productId: product.id,
                                purchaseItemId: purchaseItem.id,
                            }
                        });
                    }

                    // CÁLCULO ATÓMICO: Stock y Costo Promedio
                    const currentStock = Number(product.stock);
                    const incomingQty = Number(item.quantity);
                    const newStock = currentStock + incomingQty;

                    const currentTotalValue = currentStock * Number(product.costPrice);
                    const incomingTotalValue = incomingQty * Number(item.costPrice);
                    const newAverageCost = newStock > 0 ? (currentTotalValue + incomingTotalValue) / newStock : item.costPrice;

                    await tx.product.update({
                        where: { id: product.id },
                        data: {
                            stock: { increment: incomingQty },
                            costPrice: newAverageCost,
                        }
                    });

                    // MOVIMIENTO HISTÓRICO
                    await tx.inventoryMovement.create({
                        data: {
                            businessId,
                            productId: product.id,
                            userId,
                            type: "PURCHASE",
                            quantity: incomingQty,
                            previousStock: currentStock,
                            newStock: newStock,
                            note: `Ref: ${purchase.invoiceNumber}`
                        }
                    });
                }

                return purchase;
            });
        } catch (error) {
            // Relanzar errores conocidos de NestJS (para que el cliente los reciba con su status code correcto)
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            // Error inesperado
            console.error("Error crítico en registro de compra:", error);
            throw new BadRequestException("No se pudo completar el registro de la compra. Por favor, verifique los datos.");
        }
    }

    // =========================
    // GET PURCHASES
    // =========================
    async findAll(businessId: string) {
        return this.prisma.purchase.findMany({
            where: { businessId },
            include: {
                supplier: {
                    select: { id: true, name: true },
                },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, isSerialized: true, hasExpiry: true },
                        },
                        serials: true,
                        batches: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    // =========================
    // FIND ONE PURCHASE
    // =========================
    async findOne(id: string, businessId: string) {
        const purchase = await this.prisma.purchase.findFirst({
            where: { id, businessId },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true,
                        serials: true,
                        batches: true,
                    },
                },
            },
        });

        if (!purchase) {
            throw new NotFoundException("Purchase not found");
        }

        return purchase;
    }

    // ==========================================
    // AUTO GENERATE REORDER DRAFTS (SAFE)
    // ==========================================
    async generateAutoPurchaseDrafts(businessId: string) {
        const products = await this.prisma.product.findMany({
            where: { businessId, active: true },
        });

        const grouped = new Map<string, any[]>();

        for (const product of products) {
            if (product.stock > product.minStock) continue;

            const supplierId = product.supplierId;
            if (!supplierId) continue;

            if (!grouped.has(supplierId)) {
                grouped.set(supplierId, []);
            }

            const quantity = Math.max(product.minStock * 2 - product.stock, 1);

            grouped.get(supplierId)!.push({
                productId: product.id,
                quantity,
                costPrice: product.costPrice,
                total: quantity * Number(product.costPrice),
            });
        }

        const purchases: any[] = [];

        for (const [supplierId, items] of grouped.entries()) {
            const purchase = await this.prisma.purchase.create({
                data: {
                    supplierId,
                    businessId,
                    status: "DRAFT", // Se crea en DRAFT, no altera stock ni exige IMEIs todavía
                    invoiceNumber: `PO-${Date.now()}`,
                    total: items.reduce((acc, item) => acc + item.quantity * Number(item.costPrice), 0),
                    items: {
                        create: items.map(i => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            costPrice: i.costPrice,
                            total: i.total,
                        })),
                    },
                },
                include: {
                    items: { include: { product: true } },
                },
            });

            purchases.push(purchase);
        }

        return purchases;
    }
}