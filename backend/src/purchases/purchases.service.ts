import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";

const round2 = (n: number) => Math.round(n * 100) / 100;

type PurchaseLine = {
    productId: string;
    quantity: number;
    costPrice: number;
    lineTotal: number;
    serials: string[];
    batch?: { batchNumber: string; expiryDate: string };
};

@Injectable()
export class PurchasesService {
    private readonly logger = new Logger(PurchasesService.name);

    constructor(private prisma: PrismaService) { }

    // =========================
    // CREATE PURCHASE
    // =========================
    async create(dto: CreatePurchaseDto, businessId: string, userId: string) {
        if (!dto.items?.length) {
            throw new BadRequestException("La compra debe tener al menos un artículo.");
        }

        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    // 1. Proveedor del negocio
                    const supplier = await tx.supplier.findFirst({
                        where: { id: dto.supplierId, businessId },
                    });
                    if (!supplier) throw new BadRequestException("Proveedor no encontrado.");

                    // 2. Validar cada línea
                    let total = 0;
                    const seenSerials = new Set<string>();
                    const lines: PurchaseLine[] = [];

                    for (const item of dto.items as any[]) {
                        const quantity = Number(item.quantity);
                        const costPrice = Number(item.costPrice);

                        if (!Number.isInteger(quantity) || quantity <= 0) {
                            throw new BadRequestException("La cantidad de cada artículo debe ser un entero mayor a cero.");
                        }
                        if (!Number.isFinite(costPrice) || costPrice < 0) {
                            throw new BadRequestException("El costo de cada artículo no puede ser negativo.");
                        }

                        const product = await tx.product.findFirst({
                            where: { id: item.productId, businessId },
                        });
                        if (!product) throw new NotFoundException(`Producto ${item.productId} no encontrado.`);

                        let serials: string[] = [];

                        if (product.isSerialized) {
                            serials = (item.serials ?? [])
                                .map((s: string) => String(s).trim().toUpperCase())
                                .filter(Boolean);

                            if (serials.length !== quantity) {
                                throw new BadRequestException(
                                    `El producto "${product.name}" requiere exactamente ${quantity} IMEI/seriales.`,
                                );
                            }

                            for (const serial of serials) {
                                if (seenSerials.has(serial)) {
                                    throw new BadRequestException(`El IMEI/serial ${serial} está repetido en la compra.`);
                                }
                                seenSerials.add(serial);
                            }

                            // Un IMEI identifica un equipo físico: no puede estar dos veces en el negocio
                            const existing = await tx.itemSerial.findMany({
                                where: {
                                    serial: { in: Array.from(new Set([...serials, ...serials.map((s) => s.toLowerCase())])) },
                                    product: { businessId },
                                },
                                select: { serial: true },
                            });

                            if (existing.length > 0) {
                                throw new BadRequestException(
                                    `Conflicto de IMEI: ya existen en el inventario: ${existing.map((s) => s.serial).join(", ")}`,
                                );
                            }
                        }

                        const lineTotal = round2(quantity * costPrice);
                        total = round2(total + lineTotal);

                        lines.push({
                            productId: product.id,
                            quantity,
                            costPrice,
                            lineTotal,
                            serials,
                            batch: item.batch,
                        });
                    }

                    // 3. Cabecera
                    const purchase = await tx.purchase.create({
                        data: {
                            invoiceNumber: `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            supplierId: dto.supplierId,
                            total,
                            businessId,
                            status: "COMPLETED",
                        },
                    });

                    // 4. Líneas, stock y costo promedio
                    for (const line of lines) {
                        // Se vuelve a leer: si el mismo producto aparece en dos líneas, su stock ya cambió
                        const product = await tx.product.findFirstOrThrow({
                            where: { id: line.productId, businessId },
                        });

                        const purchaseItem = await tx.purchaseItem.create({
                            data: {
                                purchaseId: purchase.id,
                                productId: line.productId,
                                quantity: line.quantity,
                                costPrice: line.costPrice,
                                total: line.lineTotal,
                            },
                        });

                        if (product.isSerialized) {
                            await tx.itemSerial.createMany({
                                data: line.serials.map((serial) => ({
                                    serial,
                                    productId: product.id,
                                    purchaseItemId: purchaseItem.id,
                                    isSold: false,
                                })),
                            });
                        }

                        if (product.hasExpiry && line.batch) {
                            await tx.productBatch.create({
                                data: {
                                    batchNumber: line.batch.batchNumber,
                                    expiryDate: new Date(line.batch.expiryDate),
                                    initialQuantity: line.quantity,
                                    currentQuantity: line.quantity,
                                    productId: product.id,
                                    purchaseItemId: purchaseItem.id,
                                },
                            });
                        }

                        const currentStock = product.stock;
                        const newStock = currentStock + line.quantity;
                        const currentValue = Math.max(currentStock, 0) * Number(product.costPrice);
                        const newAverageCost = round2(
                            (currentValue + line.quantity * line.costPrice) / newStock,
                        );

                        await tx.product.update({
                            where: { id: product.id },
                            data: {
                                stock: { increment: line.quantity },
                                costPrice: newAverageCost,
                                status: "AVAILABLE",
                            },
                        });

                        await tx.inventoryMovement.create({
                            data: {
                                businessId,
                                productId: product.id,
                                userId,
                                type: "PURCHASE",
                                quantity: line.quantity,
                                previousStock: currentStock,
                                newStock,
                                note: `Ref: ${purchase.invoiceNumber}`,
                            },
                        });
                    }

                    return purchase;
                },
                {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                    timeout: 30000,
                    maxWait: 10000,
                },
            );
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }

            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
                throw new BadRequestException("Otra operación modificó el inventario al mismo tiempo. Intenta de nuevo.");
            }

            this.logger.error("Error crítico en registro de compra", error as any);
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
            throw new NotFoundException("Compra no encontrada.");
        }

        return purchase;
    }

    // ==========================================
    // BORRADORES DE REPOSICIÓN
    // ==========================================
    // Como se llama con GET, no debe crear un borrador nuevo en cada visita:
    // si el proveedor ya tiene uno abierto, se devuelve ese.
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
                total: round2(quantity * Number(product.costPrice)),
            });
        }

        const purchases: any[] = [];

        for (const [supplierId, items] of grouped.entries()) {
            const existingDraft = await this.prisma.purchase.findFirst({
                where: { businessId, supplierId, status: "DRAFT" },
                include: { items: { include: { product: true } } },
            });

            if (existingDraft) {
                purchases.push(existingDraft);
                continue;
            }

            const purchase = await this.prisma.purchase.create({
                data: {
                    supplierId,
                    businessId,
                    status: "DRAFT", // No altera stock ni exige IMEI todavía
                    invoiceNumber: `PO-${Date.now()}-${purchases.length}`,
                    total: round2(items.reduce((acc, item) => acc + item.quantity * Number(item.costPrice), 0)),
                    items: {
                        create: items.map((i) => ({
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