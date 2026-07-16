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
import { randomUUID } from "crypto";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { ChangeStatusDto } from "./dto/change-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddServiceItemDto } from "./dto/add-service-item.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { SalesService } from "../sales/sales.service";
import { InvoiceServiceOrderDto } from "./dto/invoice-service-order.dto";

@Injectable()
export class ServiceOrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private salesService: SalesService,
    ) { }

    // ==========================================
    // FLUJO PERMITIDO DE LOS ESTADOS
    // ==========================================

    private readonly allowedTransitions: Record<ServiceStatus, ServiceStatus[]> = {
        RECEIVED: [
            ServiceStatus.DIAGNOSING,
        ],

        DIAGNOSING: [
            ServiceStatus.REPAIRED,
        ],

        REPAIRED: [
            ServiceStatus.READY_FOR_PICKUP,
        ],

        READY_FOR_PICKUP: [
            ServiceStatus.DELIVERED,
        ],

        DELIVERED: [],
    };

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
        userId: string,
    ) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
        });

        if (!customer) {
            throw new NotFoundException("Cliente no encontrado");
        }

        if (dto.technicianId) {
            const technician = await this.prisma.user.findFirst({
                where: {
                    id: dto.technicianId,
                    businessId,
                    active: true,
                },
            });

            if (!technician) {
                throw new NotFoundException("Técnico no encontrado");
            }
        }

        const ticketNumber = await this.generateTicket();

        return this.prisma.$transaction(
            async (tx) => {
                const order = await tx.serviceOrder.create({
                    data: {
                        //-----------------------------------------
                        // IDENTIFICACIÓN
                        //-----------------------------------------

                        ticketNumber,
                        businessId,

                        //-----------------------------------------
                        // RELACIONES
                        //-----------------------------------------

                        customerId: dto.customerId,

                        technicianId: dto.technicianId,

                        receivedById: userId,

                        //-----------------------------------------
                        // INFORMACIÓN DEL EQUIPO
                        //-----------------------------------------

                        deviceType: dto.deviceType,

                        deviceBrand: dto.deviceBrand,

                        deviceModel: dto.deviceModel,

                        serialOrImei: dto.serialOrImei,

                        color: dto.color,

                        password: dto.password,

                        accessories: dto.accessories,

                        cosmeticCondition: dto.cosmeticCondition,

                        batteryLevel: dto.batteryLevel,

                        hasSim: dto.hasSim ?? false,

                        hasMemoryCard: dto.hasMemoryCard ?? false,

                        deviceTurnsOn: dto.deviceTurnsOn,

                        hasWaterDamage: dto.hasWaterDamage,

                        //-----------------------------------------
                        // RECEPCIÓN
                        //-----------------------------------------

                        problem: dto.problem,

                        observations: dto.observations,

                        estimatedDelivery: dto.estimatedDelivery
                            ? new Date(dto.estimatedDelivery)
                            : undefined,

                        //-----------------------------------------
                        // ESTADO INICIAL
                        //-----------------------------------------

                        status: ServiceStatus.RECEIVED,

                        laborCost: new Prisma.Decimal(0),

                        totalAmount: new Prisma.Decimal(0),
                    },
                });

                await tx.serviceLog.create({
                    data: {
                        serviceOrderId: order.id,
                        statusFrom: ServiceStatus.RECEIVED,
                        statusTo: ServiceStatus.RECEIVED,
                        note: "Orden creada",
                        userId: dto.technicianId ?? "SYSTEM",
                        action: "CREATE",
                    },
                });

                return order;
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
        );
    }

    // ==========================================
    // LISTAR ORDENES
    // ==========================================

    async findAll(businessId: string) {
        return this.prisma.serviceOrder.findMany({
            where: { businessId },
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

    async findOne(id: string, businessId: string) {
        const order = await this.prisma.serviceOrder.findFirst({
            where: { id, businessId },
            include: {
                customer: true,
                technician: true,
                items: {
                    include: { product: true },
                },
                logs: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!order) {
            throw new NotFoundException("Orden no encontrada");
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
        const order = await this.findOne(serviceOrderId, businessId);

        if (
            order.status === ServiceStatus.DELIVERED
        ) {
            throw new BadRequestException(
                "No se puede cambiar el técnico de una orden finalizada."
            );
        }

        const technician = await this.prisma.user.findFirst({
            where: {
                id: dto.technicianId,
                businessId,
                active: true,
            },
            select: { id: true, name: true },
        });

        if (!technician) {
            throw new NotFoundException("Técnico no encontrado");
        }

        return this.prisma.$transaction(async (tx) => {
            const updatedOrder = await tx.serviceOrder.update({
                where: { id: order.id },
                data: { technicianId: dto.technicianId },
            });


            await tx.serviceLog.create({
                data: {
                    serviceOrderId: order.id,
                    statusFrom: order.status,
                    statusTo: order.status,
                    note: `Técnico asignado: ${technician.name}`,
                    userId: dto.technicianId,
                    action: "ASSIGN_TECHNICIAN",
                },
            });

            return updatedOrder;
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

        console.log("==============");
        console.log("STATUS:", order.status);
        console.log("DIAGNOSTIC:", order.diagnostic);
        console.log("LABOR:", order.laborCost);
        console.log("TECH:", order.technicianId);


        if (
            order.status === ServiceStatus.DELIVERED ||
            order.status === ServiceStatus.READY_FOR_PICKUP
        ) {
            throw new BadRequestException(
                "No se puede modificar el estado de esta orden."
            );
        }

        // Validar transición permitida
        const allowed = this.allowedTransitions[order.status as ServiceStatus];
        if (!allowed.includes(dto.status)) {
            throw new BadRequestException(
                `No está permitido cambiar el estado de ${order.status} a ${dto.status}`
            );
        }

        // Validaciones específicas para REPAIRED
        if (dto.status === ServiceStatus.REPAIRED) {
            if (!order.technicianId) {
                throw new BadRequestException(
                    "Debe asignar un técnico antes de finalizar la reparación."
                );
            }

            if (
                !order.diagnostic ||
                order.diagnostic.trim() === ""
            ) {
                throw new BadRequestException(
                    "PRUEBA_123456_DIAGNOSTICO"
                );
            }

            if (Number(order.laborCost) <= 0) {
                throw new BadRequestException(
                    "Debe definir el costo de mano de obra."
                );
            }
        }

        return this.prisma.$transaction(async (tx) => {
            const automaticNote = dto.note ?? `Estado cambiado de ${order.status} a ${dto.status}`;

            await tx.serviceOrder.update({
                where: { id: order.id },
                data: { status: dto.status },
            });

            await tx.serviceLog.create({
                data: {
                    serviceOrderId: order.id,
                    statusFrom: order.status,
                    statusTo: dto.status,
                    note: automaticNote,
                    userId: userId || "SYSTEM",
                    action: "STATUS_CHANGE",
                },
            });

            return { message: "Estado actualizado" };
        });
    }

    // ==========================================
    // ACTUALIZAR INFORMACIÓN DE LA ORDEN
    // ==========================================
    async update(id: string, dto: UpdateServiceOrderDto, businessId: string, userId: string) {
        console.log("ESTOY DENTRO DEL UPDATE");
        console.log(dto);
        return await this.prisma.$transaction(async (tx) => {
            const order = await tx.serviceOrder.findFirst({
                where: {
                    id,
                    businessId,
                },
            });
            if (!order) throw new NotFoundException("Orden no encontrada.");
            if (
                order.status === ServiceStatus.READY_FOR_PICKUP ||
                order.status === ServiceStatus.DELIVERED
            ) {
                throw new BadRequestException(
                    "No puedes modificar esta reparación."
                );
            }

            const updatedOrder = await tx.serviceOrder.update({
                where: { id },
                data: {
                    deviceBrand: dto.deviceBrand ?? order.deviceBrand,
                    deviceModel: dto.deviceModel ?? order.deviceModel,
                    serialOrImei: dto.serialOrImei ?? order.serialOrImei,
                    problem: dto.problem ?? order.problem,

                    diagnostic: dto.diagnostic ?? order.diagnostic,
                    repairSolution: dto.repairSolution ?? order.repairSolution,
                    estimatedRepairTime:
                        dto.estimatedRepairTime ?? order.estimatedRepairTime,
                    customerApproved:
                        dto.customerApproved ?? order.customerApproved,
                },
            });



            await tx.serviceLog.create({
                data: {
                    serviceOrderId: id,
                    statusFrom: order.status,
                    statusTo: order.status,
                    note: "Información de la orden actualizada",
                    userId: userId || "SYSTEM",
                    action: "UPDATE",
                }
            });

            return updatedOrder;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    // ==========================================
    // AGREGAR REPUESTO
    // ==========================================

    async addItem(serviceOrderId: string, dto: AddServiceItemDto, businessId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await this.findOne(serviceOrderId, businessId);

            if (
                order.status === ServiceStatus.READY_FOR_PICKUP ||
                order.status === ServiceStatus.DELIVERED
            ) {
                throw new BadRequestException(
                    "No se pueden agregar repuestos."
                );
            }

            const product = await tx.product.findFirst({
                where: {
                    id: dto.productId,
                    businessId,
                    active: true
                }
            });

            if (!product || product.stock < dto.quantity) {
                throw new BadRequestException("Producto no disponible o stock insuficiente");
            }

            const itemLineTotal = Number(product.salePrice) * dto.quantity;

            await tx.serviceItem.create({
                data: {
                    serviceOrderId,
                    productId: product.id,
                    quantity: dto.quantity,
                    priceUnit: product.salePrice,
                    lineTotal: itemLineTotal,
                },
            });

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

            // Registro en historial
            await tx.serviceLog.create({
                data: {
                    serviceOrderId: order.id,
                    statusFrom: order.status,
                    statusTo: order.status,
                    note: `Se agregó ${dto.quantity} x ${product.name}`,
                    userId: userId || "SYSTEM",
                    action: "ADD_ITEM",
                },
            });

            const items = await tx.serviceItem.findMany({ where: { serviceOrderId } });
            const partsTotal = items.reduce((acc, i) => acc + (Number(i.priceUnit) * i.quantity), 0);
            const total = partsTotal + Number(order.laborCost);

            return await tx.serviceOrder.update({
                where: { id: order.id },
                data: { totalAmount: total }
            });
        });
    }

    // ==========================================
    // ELIMINAR REPUESTO
    // ==========================================

    async removeItem(serviceOrderId: string, itemId: string, businessId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const item = await tx.serviceItem.findFirst({
                where: { id: itemId, serviceOrderId },
                include: { product: true }
            });

            if (!item) throw new NotFoundException("Ítem no encontrado");

            const order = await tx.serviceOrder.findUnique({
                where: { id: serviceOrderId },
                select: {
                    status: true,
                    laborCost: true
                }
            });

            if (!order) throw new NotFoundException("Orden no encontrada");

            if (
                order.status === ServiceStatus.READY_FOR_PICKUP ||
                order.status === ServiceStatus.DELIVERED
            ) {
                throw new BadRequestException(
                    "No puedes modificar el costo de la reparación."
                );
            }

            // Devolver stock
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
            });

            // Registrar movimiento de devolución
            await tx.inventoryMovement.create({
                data: {
                    businessId,
                    productId: item.productId,
                    type: 'RETURN',
                    quantity: item.quantity,
                    note: `Reversión de orden: ${serviceOrderId}`
                }
            });

            // Eliminar ítem
            await tx.serviceItem.delete({ where: { id: itemId } });

            // Registrar en historial
            await tx.serviceLog.create({
                data: {
                    serviceOrderId: serviceOrderId,
                    statusFrom: order.status,
                    statusTo: order.status,
                    note: `Se eliminó ${item.quantity} x ${item.product.name}`,
                    userId: userId || "SYSTEM",
                    action: "REMOVE_ITEM",
                },
            });

            // Recalcular total
            const remainingItems = await tx.serviceItem.findMany({ where: { serviceOrderId } });
            const total = remainingItems.reduce((acc, i) => acc + (Number(i.priceUnit) * i.quantity), 0)
                + Number(order.laborCost);

            return await tx.serviceOrder.update({
                where: { id: serviceOrderId },
                data: { totalAmount: total }
            });
        });
    }

    // ==========================================
    // ACTUALIZAR MANO DE OBRA
    // ==========================================

    async updateLaborCost(id: string, businessId: string, laborCost: number, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await this.findOne(id, businessId);
            if (order.status === 'DELIVERED') throw new BadRequestException("No puedes modificar costos de una orden entregada.");

            const partsTotal = order.items.reduce((acc, i) => acc + (Number(i.priceUnit) * i.quantity), 0);

            const updatedOrder = await tx.serviceOrder.update({
                where: { id },
                data: { laborCost, totalAmount: partsTotal + laborCost }
            });

            await tx.serviceLog.create({
                data: {
                    serviceOrderId: id,
                    statusFrom: order.status,
                    statusTo: order.status,
                    note: `Mano de obra actualizada a: ${laborCost}`,
                    userId: userId || "SYSTEM",
                    action: "UPDATE_LABOR_COST",
                }
            });

            return updatedOrder;
        });
    }




    async deliverDevice(
        id: string,
        userId: string,
        businessId: string,
    ) {

        const order = await this.prisma.serviceOrder.findFirst({
            where: {
                id,
                businessId,
            },
            include: {
                sale: true,
            },
        });

        if (!order) {
            throw new NotFoundException(
                "Orden de reparación no encontrada."
            );
        }

        if (order.status !== ServiceStatus.READY_FOR_PICKUP) {
            throw new BadRequestException(
                "El equipo aún no está listo para ser entregado."
            );
        }

        if (!order.sale) {
            throw new BadRequestException(
                "La reparación no ha sido facturada."
            );
        }

        return await this.prisma.$transaction(async (tx) => {

            await tx.serviceLog.create({
                data: {
                    serviceOrderId: order.id,
                    statusFrom: ServiceStatus.READY_FOR_PICKUP,
                    statusTo: ServiceStatus.DELIVERED,
                    note: "Equipo entregado al cliente.",
                    userId,
                    action: "DELIVER_DEVICE",
                },
            });

            return await tx.serviceOrder.update({
                where: {
                    id: order.id,
                },
                data: {
                    status: ServiceStatus.DELIVERED,
                    deliveredAt: new Date(),
                    deliveredById: userId,
                },
            });

        });

    }

    async invoiceServiceOrder(
        id: string,
        userId: string,
        businessId: string,
        dto: InvoiceServiceOrderDto,
    ) {

        const order = await this.prisma.serviceOrder.findFirst({
            where: {
                id,
                businessId,
            },
            include: {
                sale: true,
                items: true,
            },
        });

        if (!order) {
            throw new NotFoundException(
                "Orden de reparación no encontrada."
            );
        }

        if (order.sale) {
            throw new BadRequestException(
                "Esta reparación ya fue facturada."
            );
        }

        if (order.status !== ServiceStatus.REPAIRED) {
            throw new BadRequestException(
                "La reparación debe estar finalizada antes de ser facturada."
            );


        }

        if (Number(order.totalAmount) <= 0) {
            throw new BadRequestException(
                "La reparación no tiene un monto válido."
            );
        }

        const saleItems = order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            salePrice: Number(item.priceUnit),
        }));

        const createSaleDto = {

            idempotencyKey: randomUUID(),

            paymentMethod: dto.paymentMethod,

            received: dto.received,

            change: dto.change,

            initialPayment: dto.initialPayment,

            customerId: order.customerId,

            customTotal: Number(order.totalAmount),

            ncfType: dto.ncfType,

            serviceOrderId: order.id,

            items: saleItems,

        };

        const sale = await this.salesService.createSale(
            createSaleDto,
            userId,
            businessId,
        );

        await this.prisma.serviceOrder.update({
            where: {
                id: order.id,
            },
            data: {
                status: ServiceStatus.READY_FOR_PICKUP,
            },
        });

        await this.prisma.serviceLog.create({
            data: {
                serviceOrderId: order.id,
                statusFrom: ServiceStatus.REPAIRED,
                statusTo: ServiceStatus.READY_FOR_PICKUP,
                note: `Reparación facturada. Equipo listo para ser retirado.`,
                userId,
                action: "READY_FOR_PICKUP",
            },
        });

        return sale;

    }


}