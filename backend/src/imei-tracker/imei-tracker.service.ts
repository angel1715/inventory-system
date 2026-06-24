import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate de apuntar correctamente a tu archivo

@Injectable()
export class ImeiTrackerService {
    constructor(private prisma: PrismaService) { }

    async trackSerial(serialNumber: string) {
        const cleanSerial = serialNumber.trim().toUpperCase();

        // 1. Buscamos el serial usando el modelo correcto: itemSerial
        const serialRecord = await this.prisma.itemSerial.findFirst({
            where: {
                serial: {
                    equals: cleanSerial,
                    mode: 'insensitive' // Por si acaso hay variaciones de minúsculas en la DB
                }
            },
            include: {
                product: true,
                // Traemos la información de la compra mediante la línea de compra (PurchaseItem)
                purchaseItem: {
                    include: {
                        purchase: {
                            include: { supplier: true }
                        }
                    }
                }
            }
        });

        if (!serialRecord) {
            throw new NotFoundException(`El IMEI o número de serie "${cleanSerial}" no fue encontrado en el inventario.`);
        }

        // 2. Buscamos si este IMEI ya fue despachado en alguna venta (SaleItem -> Sale)
        // Ya que en tu esquema SaleItem guarda el "serialNumber" como un String opcional
        const saleItemRecord = await this.prisma.saleItem.findFirst({
            where: {
                productId: serialRecord.productId,
                serialNumber: cleanSerial
            },
            include: {
                sale: {
                    include: {
                        customer: true,
                        createdBy: true // El usuario que hizo la venta en tu esquema se llama createdBy
                    }
                }
            }
        });

        // 3. Cálculo dinámico de la garantía (6 meses a partir de la venta si existe)
        let warrantyStatus = { active: false, daysLeft: 0, expiresAt: null as Date | null };

        if (saleItemRecord?.sale?.createdAt) {
            const saleDate = new Date(saleItemRecord.sale.createdAt);
            const expiryDate = new Date(saleDate);
            expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 meses de cobertura estándar

            const today = new Date();
            const timeLeft = expiryDate.getTime() - today.getTime();

            if (timeLeft > 0) {
                warrantyStatus = {
                    active: true,
                    daysLeft: Math.ceil(timeLeft / (1000 * 60 * 60 * 24)),
                    expiresAt: expiryDate
                };
            }
        }

        // 4. Retornamos la respuesta limpia estructurada exactamente para tu UI en Next.js
        return {
            serial: serialRecord.serial,
            status: serialRecord.isSold ? 'SOLD' : 'AVAILABLE', // Usamos tu bandera isSold
            product: {
                id: serialRecord.product.id,
                name: serialRecord.product.name,
                sku: serialRecord.product.sku,
            },
            lifecycle: {
                purchase: serialRecord.purchaseItem ? {
                    date: serialRecord.purchaseItem.purchase.createdAt,
                    invoiceNumber: serialRecord.purchaseItem.purchase.invoiceNumber,
                    supplier: serialRecord.purchaseItem.purchase.supplier?.name || 'Proveedor Desconocido',
                    costPrice: Number(serialRecord.purchaseItem.costPrice),
                } : null,
                sale: saleItemRecord ? {
                    date: saleItemRecord.sale.createdAt,
                    invoiceNumber: saleItemRecord.sale.invoiceNumber,
                    customer: saleItemRecord.sale.customer?.name || 'Cliente de Caja (Walk-in)',
                    seller: saleItemRecord.sale.createdBy?.name || 'Sistema',
                    price: Number(saleItemRecord.salePrice),
                    quantity: saleItemRecord.quantity
                } : null,
            },
            warranty: warrantyStatus
        };
    }
}