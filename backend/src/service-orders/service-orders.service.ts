import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from "@nestjs/common";

import {
    Prisma,
    ServiceStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { randomUUID, randomBytes } from "crypto";
import { CreateServiceOrderDto } from "./dto/create-service-order.dto";
import { ChangeStatusDto } from "./dto/change-status.dto";
import { AssignTechnicianDto } from "./dto/assign-technician.dto";
import { AddServiceItemDto } from "./dto/add-service-item.dto";
import { UpdateServiceOrderDto } from "./dto/update-service-order.dto";
import { SalesService } from "../sales/sales.service";
import { InvoiceServiceOrderDto } from "./dto/invoice-service-order.dto";
import { CreateServicePhotoDto } from "./dto/create-service-photo.dto";
import { EmailService } from "../email/email.service";

@Injectable()
export class ServiceOrdersService {
         private readonly logger = new Logger(ServiceOrdersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private salesService: SalesService,
        private readonly emailService: EmailService,
    ) { }

    // ==========================================
    // FLUJO PERMITIDO DE LOS ESTADOS
    // ==========================================
   private readonly allowedTransitions:
    Record<ServiceStatus, ServiceStatus[]> = {

        RECEIVED: [
            ServiceStatus.DIAGNOSING,
            ServiceStatus.CANCELLED,
        ],

        DIAGNOSING: [
            ServiceStatus.REPAIRED,
            ServiceStatus.NOT_REPAIRABLE,
            ServiceStatus.CANCELLED,
        ],

        REPAIRED: [
            ServiceStatus.READY_FOR_PICKUP,
        ],

        READY_FOR_PICKUP: [],   // DELIVERED solo vía deliverDevice()

        DELIVERED: [],
        CANCELLED: [],
        NOT_REPAIRABLE: [],
    };

    private readonly finalStatuses: ServiceStatus[] = [
    ServiceStatus.DELIVERED,
    ServiceStatus.CANCELLED,
    ServiceStatus.NOT_REPAIRABLE,
];

    // ==========================================
    // GENERAR TICKET
    // ==========================================

        private async generateTicket(businessId: string) {
        const last = await this.prisma.serviceOrder.findFirst({
            where: { businessId },
            orderBy: { createdAt: "desc" },
            select: { ticketNumber: true },
        });

        const lastNumber = last
            ? parseInt(last.ticketNumber.replace(/\D/g, ""), 10) || 0
            : 0;

        return `SRV-${String(lastNumber + 1).padStart(6, "0")}`;
    }

    // ==========================================
    // CREAR ORDEN
    // ==========================================

    async create(
        dto: CreateServiceOrderDto,
        businessId: string,
        userId: string,
    ) {
                const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, businessId },
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

                const ticketNumber = await this.generateTicket(businessId);

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
                        userId,
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
                sale: true,
                items: {
                    include: { product: true },
                },
                logs: {
                    orderBy: { createdAt: "desc" },
                },
                photos: {
                orderBy: { createdAt: "asc" },
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
        userId: string,
    ) {
        const order = await this.findOne(serviceOrderId, businessId);

                if (this.finalStatuses.includes(order.status)) {
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
                    userId,
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


                if (this.finalStatuses.includes(order.status)) {
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
                    "Necesitas registrar el diagnostico"
                );
            }

            if (Number(order.laborCost) <= 0) {
                throw new BadRequestException(
                    "Debe definir el costo de mano de obra."
                );
            }

            if (!order.customerApproved) {     // <- NUEVO
        throw new BadRequestException(
            "El cliente debe aprobar la cotización antes de finalizar la reparación."
        );
    }
        }

               await this.prisma.$transaction(async (tx) => {
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

                });

        // Aviso al cliente cuando el equipo queda listo. Si el correo falla,
        // el cambio de estado ya quedó guardado.
        const notification =
            dto.status === ServiceStatus.READY_FOR_PICKUP
                ? await this.notifyRepairReady(order.id, businessId, userId)
                : null;

        return { message: "Estado actualizado", notification };
    }

    // ==========================================
    // ACTUALIZAR INFORMACIÓN DE LA ORDEN
    // ==========================================
    async update(id: string, dto: UpdateServiceOrderDto, businessId: string, userId: string) {
        
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
                this.finalStatuses.includes(order.status)
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
                    warrantyDays:
                        dto.warrantyDays ?? order.warrantyDays,
                },
            });



                        const approvalChanged =
                dto.customerApproved !== undefined &&
                dto.customerApproved !== order.customerApproved;

            const approvalNote = approvalChanged
                ? dto.customerApproved
                    ? " · Cliente aprobó la cotización"
                    : " · Aprobación de cotización revocada"
                : "";

                        const warrantyChanged =
                dto.warrantyDays !== undefined &&
                dto.warrantyDays !== (order.warrantyDays ?? 0);

            const warrantyNote = warrantyChanged
                ? dto.warrantyDays === 0
                    ? " · Sin garantía"
                    : ` · Garantía: ${dto.warrantyDays} días`
                : "";

            await tx.serviceLog.create({
                data: {
                    serviceOrderId: id,
                    statusFrom: order.status,
                    statusTo: order.status,
                    note: `Información de la orden actualizada${approvalNote}${warrantyNote}`,
                    userId: userId || "SYSTEM",
                    action: "UPDATE",
                }
            });

            return updatedOrder;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

  // ==========================================
    // AGREGAR REPUESTO (SOLO REGISTRA EN LA ORDEN, SIN DESCONTAR STOCK AÚN)
    // ==========================================

    async addItem(serviceOrderId: string, dto: AddServiceItemDto, businessId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const order = await this.findOne(serviceOrderId, businessId);

                        if (
                order.status === ServiceStatus.READY_FOR_PICKUP ||
                this.finalStatuses.includes(order.status)
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

            // Solo validamos que el producto exista y esté activo. 
            // (Opcional: Si quieres validar que haya stock disponible para asignarlo, puedes dejar el check de stock pero sin restarlo todavía).
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

            // ❌ ELIMINADO: Ya no descontamos stock aquí ni creamos inventoryMovement falso.
            // El inventario y el movimiento oficial se harán una sola vez al facturar la orden.

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
                where: {
                    id: itemId,
                    serviceOrderId,
                    serviceOrder: { businessId },
                },
                include: { product: true }
            });

            if (!item) throw new NotFoundException("Ítem no encontrado");

            const order = await tx.serviceOrder.findFirst({
                where: { id: serviceOrderId, businessId },
                select: {
                    status: true,
                    laborCost: true
                }
            });

            if (!order) throw new NotFoundException("Orden no encontrada");

            if (
                order.status === ServiceStatus.READY_FOR_PICKUP ||
                this.finalStatuses.includes(order.status)
            ) {
                throw new BadRequestException(
                    "No puedes modificar el costo de la reparación."
                );
            }

            // El stock NO se toca aquí: solo se descuenta al facturar.
            await tx.serviceItem.delete({ where: { id: itemId } });

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
                        if (this.finalStatuses.includes(order.status) || order.sale) throw new BadRequestException("No puedes modificar los costos de una orden finalizada o ya facturada.");

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

    const deliveredAt = new Date();
    const warrantyUntil = order.warrantyDays
        ? new Date(deliveredAt.getTime() + order.warrantyDays * 24 * 60 * 60 * 1000)
        : null;

    await tx.serviceLog.create({
        data: {
            serviceOrderId: order.id,
            statusFrom: ServiceStatus.READY_FOR_PICKUP,
            statusTo: ServiceStatus.DELIVERED,
                        note: warrantyUntil
                ? `Equipo entregado al cliente. Garantía hasta el ${warrantyUntil.toLocaleDateString("es-DO", { timeZone: "America/Santo_Domingo" })}.`
                : "Equipo entregado al cliente.",
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
            deliveredAt,
            deliveredById: userId,
            warrantyUntil,   // <- NUEVO
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
        where: { id, businessId },
        include: { sale: true, items: true },
    });

    if (!order) {
        throw new NotFoundException("Orden de reparación no encontrada.");
    }

    if (order.sale) {
        throw new BadRequestException("Esta reparación ya fue facturada.");
    }

    if (order.status !== ServiceStatus.READY_FOR_PICKUP) {
        throw new BadRequestException(
            "La reparación aún no está lista para ser retirada."
        );
    }

    if (Number(order.totalAmount) <= 0) {
        throw new BadRequestException("La reparación no tiene un monto válido.");
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

    // La orden permanece en READY_FOR_PICKUP: está facturada,
    // pero aún no se ha entregado físicamente el equipo.
    return this.salesService.createSale(createSaleDto, userId, businessId);
}

// ==========================================
// AGREGAR FOTO
// ==========================================

async addPhoto(
    serviceOrderId: string,
    dto: CreateServicePhotoDto,
    businessId: string,
    userId: string,
) {
    const order = await this.prisma.serviceOrder.findFirst({
        where: { id: serviceOrderId, businessId },
    });

    if (!order) {
        throw new NotFoundException("Orden de reparación no encontrada.");
    }

    const photoCount = await this.prisma.servicePhoto.count({
        where: { serviceOrderId },
    });

    if (photoCount >= 5) {
        throw new BadRequestException(
            "Esta orden ya alcanzó el límite de 5 fotos."
        );
    }

    const photo = await this.prisma.servicePhoto.create({
        data: {
            serviceOrderId,
            imageUrl: dto.imageUrl,
            type: dto.type,
            description: dto.description,
            uploadedById: userId,
        },
    });

    await this.prisma.serviceLog.create({
        data: {
            serviceOrderId,
            statusFrom: order.status,
            statusTo: order.status,
            note: `Foto agregada (${dto.type})`,
            userId,
            action: "ADD_PHOTO",
        },
    });

    return photo;
}

// ==========================================
// ELIMINAR FOTO
// ==========================================

async removePhoto(
    serviceOrderId: string,
    photoId: string,
    businessId: string,
) {
    const photo = await this.prisma.servicePhoto.findFirst({
        where: {
            id: photoId,
            serviceOrderId,
            serviceOrder: { businessId },
        },
    });

    if (!photo) {
        throw new NotFoundException("Foto no encontrada.");
    }

    await this.prisma.servicePhoto.delete({ where: { id: photoId } });

    return { message: "Foto eliminada" };
}

// ==========================================
// LINK PÚBLICO DE SEGUIMIENTO
// ==========================================

async getOrCreateTrackingToken(serviceOrderId: string, businessId: string) {
    const order = await this.prisma.serviceOrder.findFirst({
        where: { id: serviceOrderId, businessId },
        select: { id: true, trackingToken: true },
    });

    if (!order) {
        throw new NotFoundException("Orden de reparación no encontrada.");
    }

    if (order.trackingToken) {
        return { token: order.trackingToken };
    }

    // updateMany con trackingToken: null evita que dos clics simultáneos
    // generen dos tokens distintos para la misma orden.
    await this.prisma.serviceOrder.updateMany({
        where: { id: order.id, trackingToken: null },
        data: { trackingToken: randomBytes(18).toString("base64url") },
    });

    const fresh = await this.prisma.serviceOrder.findUnique({
        where: { id: order.id },
        select: { trackingToken: true },
    });

    return { token: fresh!.trackingToken as string };
}

// Endpoint PÚBLICO: devuelve únicamente datos que el cliente puede ver.
async findByTrackingToken(token: string) {
    const order = await this.prisma.serviceOrder.findUnique({
        where: { trackingToken: token },
        select: {
            ticketNumber: true,
            status: true,
            deviceBrand: true,
            deviceModel: true,
            createdAt: true,
            estimatedDelivery: true,
            deliveredAt: true,
            warrantyDays: true,
            warrantyUntil: true,
            customer: { select: { name: true } },
            business: {
                select: {
                    name: true,
                    phone: true,
                    address: true,
                    logoUrl: true,
                    settings: {
                        select: {
                            businessName: true,
                            phone: true,
                            address: true,
                            logoUrl: true,
                        },
                    },
                },
            },
            // Solo cambios de estado; sin notas internas.
            logs: {
                where: {
                    action: {
                        in: ["CREATE", "STATUS_CHANGE", "DELIVER_DEVICE", "DELIVERED"],
                    },
                },
                orderBy: { createdAt: "asc" },
                select: { statusTo: true, createdAt: true },
            },
        },
    });

    if (!order) {
        throw new NotFoundException("Seguimiento no encontrado.");
    }

    const settings = order.business.settings;

    return {
        ticketNumber: order.ticketNumber,
        status: order.status,
        deviceBrand: order.deviceBrand,
        deviceModel: order.deviceModel,
        createdAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        warrantyDays: order.warrantyDays,
        warrantyUntil: order.warrantyUntil,
        customerFirstName: order.customer.name.trim().split(/\s+/)[0] || null,
        business: {
            name: settings?.businessName || order.business.name,
            phone: settings?.phone || order.business.phone,
            address: settings?.address || order.business.address,
            logoUrl: settings?.logoUrl || order.business.logoUrl,
        },
        timeline: order.logs.map((log) => ({
            status: log.statusTo,
            at: log.createdAt,
        })),
    };
}

// ==========================================
// NOTIFICAR AL CLIENTE: EQUIPO LISTO
// ==========================================

private async notifyRepairReady(
    serviceOrderId: string,
    businessId: string,
    userId: string,
): Promise<{ sent: boolean; reason?: "NO_EMAIL" | "FAILED" }> {
    try {
        const order = await this.prisma.serviceOrder.findFirst({
            where: { id: serviceOrderId, businessId },
            select: {
                ticketNumber: true,
                deviceBrand: true,
                deviceModel: true,
                customer: { select: { name: true, email: true } },
                business: {
                    select: {
                        name: true,
                        phone: true,
                        address: true,
                        email: true,
                        settings: {
                            select: {
                                businessName: true,
                                phone: true,
                                address: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) return { sent: false, reason: "FAILED" };

        const to = order.customer.email?.trim();
        if (!to) return { sent: false, reason: "NO_EMAIL" };

        const { token } = await this.getOrCreateTrackingToken(
            serviceOrderId,
            businessId,
        );

        const frontendUrl = (process.env.FRONTEND_URL ?? "").replace(/\/$/, "");
        const settings = order.business.settings;

        const sent = await this.emailService.sendRepairReadyEmail({
            to,
            customerName:
                order.customer.name.trim().split(/\s+/)[0] || order.customer.name,
            businessName: settings?.businessName || order.business.name,
            businessPhone: settings?.phone || order.business.phone,
            businessAddress: settings?.address || order.business.address,
            replyToEmail: settings?.email || order.business.email,
            ticketNumber: order.ticketNumber,
            device: `${order.deviceBrand} ${order.deviceModel}`,
            trackingUrl: `${frontendUrl}/track/${token}`,
        });

        if (!sent) return { sent: false, reason: "FAILED" };

        await this.prisma.serviceLog.create({
            data: {
                serviceOrderId,
                statusFrom: ServiceStatus.READY_FOR_PICKUP,
                statusTo: ServiceStatus.READY_FOR_PICKUP,
                note: `Cliente notificado por email (${to})`,
                userId,
                action: "EMAIL_NOTIFICATION",
            },
        });

        return { sent: true };
    } catch (error: any) {
        this.logger.error(`Error notificando al cliente: ${error?.message}`);
        return { sent: false, reason: "FAILED" };
    }
}

// Reenvío manual del aviso "equipo listo"
async resendReadyNotification(
    serviceOrderId: string,
    businessId: string,
    userId: string,
) {
    const order = await this.prisma.serviceOrder.findFirst({
        where: { id: serviceOrderId, businessId },
        select: { status: true },
    });

    if (!order) {
        throw new NotFoundException("Orden de reparación no encontrada.");
    }

    if (order.status !== ServiceStatus.READY_FOR_PICKUP) {
        throw new BadRequestException(
            "Solo se puede avisar cuando la orden está lista para retirar."
        );
    }

    return this.notifyRepairReady(serviceOrderId, businessId, userId);
}

}