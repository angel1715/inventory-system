import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common";

import {
    Prisma,
    ServiceStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { ChangeStatusDto } from "./dto/change-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddServiceItemDto } from "./dto/add-service-item.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";

@Injectable()
export class ServiceOrdersService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    // ==========================================
    // GENERAR TICKET
    // ==========================================

    private async generateTicket() {
        const total = await this.prisma.serviceOrder.count();


        return `SRV-${String(total + 1).padStart(6, "0")}`;


    }

    // ==========================================
    // CREAR ORDEN
    // ==========================================

    async create(
        dto: CreateServiceOrderDto,
        businessId: string,
    ) {
        const customer = await this.prisma.customer.findUnique({
            where: {
                id: dto.customerId,
            },
        });

        console.log(customer);


        if (!customer) {
            throw new NotFoundException(
                "Cliente no encontrado",
            );
        }

        if (dto.technicianId) {
            const technician =
                await this.prisma.user.findFirst({
                    where: {
                        id: dto.technicianId,
                        businessId,
                        active: true,
                    },
                });

            if (!technician) {
                throw new NotFoundException(
                    "Técnico no encontrado",
                );
            }
        }

        const ticketNumber =
            await this.generateTicket();

        return this.prisma.$transaction(
            async (tx) => {
                const order =
                    await tx.serviceOrder.create({
                        data: {
                            ticketNumber,
                            businessId,
                            customerId: dto.customerId,
                            technicianId: dto.technicianId,
                            deviceBrand: dto.deviceBrand,
                            deviceModel: dto.deviceModel,
                            serialOrImei: dto.serialOrImei,
                            problem: dto.problem,
                            status: ServiceStatus.RECEIVED,


                            laborCost: 0,
                            totalAmount: 0,
                        },
                    });

                await tx.serviceLog.create({
                    data: {
                        serviceOrderId:
                            order.id,

                        statusFrom:
                            ServiceStatus.RECEIVED,

                        statusTo:
                            ServiceStatus.RECEIVED,

                        note:
                            "Orden creada",

                        userId:
                            dto.technicianId ??
                            "SYSTEM",
                    },
                });

                return order;
            },
            {
                isolationLevel:
                    Prisma.TransactionIsolationLevel.Serializable,
            },
        );


    }

    // ==========================================
    // LISTAR ORDENES
    // ==========================================

    async findAll(businessId: string) {
        return this.prisma.serviceOrder.findMany({
            where: {
                businessId,
            },


            include: {
                customer: true,
                technician: true,
            },

            orderBy: {
                createdAt: "desc",
            },
        });


    }

    // ==========================================
    // DETALLE
    // ==========================================

    async findOne(
        id: string,
        businessId: string,
    ) {
        const order =
            await this.prisma.serviceOrder.findFirst({
                where: {
                    id,
                    businessId,
                },


                include: {
                    customer: true,

                    technician: true,

                    items: {
                        include: {
                            product: true,
                        },
                    },

                    logs: {
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
            });

        if (!order) {
            throw new NotFoundException(
                "Orden no encontrada",
            );
        }

        return order;


    }

    // ==========================================
    // ASIGNAR TECNICO
    // ==========================================

    async assignTechnician(
        serviceOrderId: string,
        dto: AssignTechnicianDto,
        businessId: string,
    ) {
        const order =
            await this.findOne(
                serviceOrderId,
                businessId,
            );


        const technician =
            await this.prisma.user.findFirst({
                where: {
                    id: dto.technicianId,
                    businessId,
                    active: true,
                },
            });

        if (!technician) {
            throw new NotFoundException(
                "Técnico no encontrado",
            );
        }

        return this.prisma.serviceOrder.update({
            where: {
                id: order.id,
            },

            data: {
                technicianId:
                    dto.technicianId,
            },
        });


    }

    // ==========================================
    // CAMBIAR ESTADO
    // ==========================================

    async changeStatus(
        serviceOrderId: string,
        dto: ChangeStatusDto,
        businessId: string,
        userId: string,
    ) {
        const order = await this.findOne(serviceOrderId, businessId);
        if (order.status === 'DELIVERED') {
            throw new BadRequestException("Esta orden está cerrada y no permite cambios de estado.");
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.serviceOrder.update({
                where: { id: order.id },
                data: { status: dto.status },
            });

            // 2. Registrar el log con validación de seguridad para la nota
            await tx.serviceLog.create({
                data: {
                    serviceOrderId: order.id,
                    statusFrom: order.status,
                    statusTo: dto.status,
                    note: dto.note || "Sin nota", // Seguridad: nunca enviar vacío/null
                    userId: userId || "SYSTEM",  // Seguridad: nunca enviar null
                },
            });

            return { message: "Estado actualizado" };
        });
    }

    private async createLog(tx: Prisma.TransactionClient, orderId: string, statusFrom: string, statusTo: string, note: string, userId: string) {
        await tx.serviceLog.create({
            data: { serviceOrderId: orderId, statusFrom, statusTo, note, userId: userId || "SYSTEM" }
        });
    }

    // ==========================================
    // ACTUALIZAR INFORMACIÓN DE LA ORDEN
    // ==========================================
    async update(id: string, dto: UpdateServiceOrderDto, businessId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await tx.serviceOrder.findUnique({ where: { id, businessId } });
            if (!order) throw new NotFoundException("Orden no encontrada.");
            if (order.status === 'DELIVERED') throw new BadRequestException("No puedes modificar una orden entregada.");

            const updatedOrder = await tx.serviceOrder.update({
                where: { id },
                data: {
                    deviceBrand: dto.deviceBrand ?? order.deviceBrand,
                    deviceModel: dto.deviceModel ?? order.deviceModel,
                    serialOrImei: dto.serialOrImei ?? order.serialOrImei,
                    problem: dto.problem ?? order.problem,
                }
            });

            // Registrar cambios en el log
            await this.createLog(tx, id, order.status, order.status, "Información de la orden actualizada", userId);

            return updatedOrder;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    // ==========================================
    // AGREGAR REPUESTO
    // ==========================================

    async addItem(serviceOrderId: string, dto: AddServiceItemDto, businessId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Validar orden (asegurando que pertenece al negocio) y obtener el ticketNumber para el log
            const order = await this.findOne(serviceOrderId, businessId);

            // 2. Validar producto
            const product = await tx.product.findFirst({
                where: { id: dto.productId, businessId, active: true }
            });

            if (!product || product.stock < dto.quantity) {
                throw new BadRequestException("Producto no disponible o stock insuficiente");
            }

            // 3. Crear ítem de servicio
            await tx.serviceItem.create({
                data: {
                    serviceOrderId,
                    productId: product.id,
                    quantity: dto.quantity,
                    priceUnit: product.salePrice, // Precio al momento del registro
                },
            });

            // 4. Descontar inventario y registrar movimiento
            await tx.product.update({
                where: { id: product.id },
                data: { stock: { decrement: dto.quantity } }
            });

            await tx.inventoryMovement.create({
                data: {
                    businessId,
                    productId: product.id,
                    userId,
                    type: 'SALE',
                    quantity: dto.quantity,
                    note: `Uso en orden: ${order.ticketNumber}`
                }
            });

            // 5. Recalcular total de la orden
            const items = await tx.serviceItem.findMany({ where: { serviceOrderId } });
            const partsTotal = items.reduce((acc, i) => acc + (Number(i.priceUnit) * i.quantity), 0);
            const total = partsTotal + Number(order.laborCost);

            return await tx.serviceOrder.update({
                where: { id: order.id },
                data: { totalAmount: total }
            });
        });
    }

    // --- Actualizar Mano de Obra y Recalcular ---
    async updateLaborCost(id: string, businessId: string, laborCost: number, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await this.findOne(id, businessId);
            if (order.status === 'DELIVERED') throw new BadRequestException("No puedes modificar costos de una orden entregada.");

            const partsTotal = order.items.reduce((acc, i) => acc + (Number(i.priceUnit) * i.quantity), 0);

            const updatedOrder = await tx.serviceOrder.update({
                where: { id },
                data: { laborCost, totalAmount: partsTotal + laborCost }
            });

            await this.createLog(tx, id, order.status, order.status, `Mano de obra actualizada a: ${laborCost}`, userId);

            return updatedOrder;
        });
    }

    async removeItem(serviceOrderId: string, itemId: string, businessId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const item = await tx.serviceItem.findFirst({ where: { id: itemId, serviceOrderId } });
            if (!item) throw new NotFoundException("Ítem no encontrado");

            // 1. Regresar stock
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
            });

            // AGREGADO: Registrar el movimiento de devolución
            await tx.inventoryMovement.create({
                data: {
                    businessId,
                    productId: item.productId,
                    type: 'RETURN',
                    quantity: item.quantity,
                    note: `Reversión de orden: ${serviceOrderId}`
                }
            });

            // 2. Eliminar ítem
            await tx.serviceItem.delete({ where: { id: itemId } });

            // 3. Recalcular total
            const remainingItems = await tx.serviceItem.findMany({ where: { serviceOrderId } });
            const order = await tx.serviceOrder.findUnique({ where: { id: serviceOrderId } });

            // Usamos Number() para asegurar operaciones matemáticas correctas con Decimal
            const total = remainingItems.reduce((acc, i) => acc + (Number(i.priceUnit) * i.quantity), 0) + Number(order!.laborCost);

            return await tx.serviceOrder.update({
                where: { id: serviceOrderId },
                data: { totalAmount: total }
            });
        });
    }

    async completeServiceOrder(orderId: string, userId: string, businessId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Obtener orden con seguridad
            const order = await tx.serviceOrder.findUnique({
                where: { id: orderId, businessId },
            });

            if (!order) throw new NotFoundException("Orden no encontrada.");

            // 2. Validación de estado: ¡Evita el doble cobro!
            if (order.status === 'DELIVERED') {
                throw new BadRequestException("Esta orden ya fue entregada y cobrada.");
            }

            // 3. Validar Caja Abierta
            const session = await tx.cashSession.findFirst({
                where: { status: "OPEN", businessId }
            });
            if (!session) {
                throw new BadRequestException("Debe haber una caja abierta para entregar la orden.");
            }

            // 4. Registrar la Venta (Ingreso en Caja)
            // Nota: No descontamos stock aquí, porque se hizo en addItem()
            await tx.sale.create({
                data: {
                    invoiceNumber: `REP-${order.ticketNumber}`,
                    idempotencyKey: `REP-${order.id}`, // Evita duplicados
                    total: order.totalAmount,
                    subtotal: order.totalAmount,
                    discount: 0,
                    tax: 0,
                    paymentMethod: 'CASH',
                    cashSessionId: session.id,
                    businessId,
                    createdById: userId,
                }
            });

            // 5. Finalizar Orden
            return await tx.serviceOrder.update({
                where: { id: orderId },
                data: {
                    status: 'DELIVERED',
                    // Opcional: Guardar fecha de entrega para reportes de KPIs
                    deliveredAt: new Date()
                }
            });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
}
