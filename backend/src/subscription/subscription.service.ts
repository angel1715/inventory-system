import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { EmailService } from '../email/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name);
    constructor(private prisma: PrismaService, private emailService: EmailService) { }

    /**
     * Valida si el negocio tiene acceso activo (Trial, Subscription o Lifetime).
     */
    async hasActiveAccess(businessId: string): Promise<boolean> {
        const sub = await this.prisma.subscription.findUnique({
            where: { businessId },
        });

        if (!sub) return false;

        // 1. Acceso de por vida
        if (sub.accessType === 'LIFETIME') return true;

        // 2. Si es TRIAL o SUBSCRIPTION, validamos la fecha actual vs vencimiento
        return sub.currentPeriodEnd > new Date();
    }

    // Agrega esto a tu SubscriptionService
    async createManualPaymentLog(businessId: string, dto: UploadReceiptDto) {
        try {
            // 1. Guardamos en BD e incluimos el negocio para obtener su nombre
            const log = await this.prisma.manualPaymentLog.create({
                data: {
                    businessId,
                    amount: dto.amount,
                    referenceNumber: dto.referenceNumber,
                    receiptUrl: dto.receiptUrl,
                    status: 'PENDING',
                },
                include: { business: true }
            });

            // 2. Notificación al Admin (tú)
            await this.emailService.sendAdminNotification(log.business.name, log.amount.toNumber());
            return log;
        } catch (error: any) {
            if (error?.code === 'P2002') {
                this.logger.warn(`Intento de duplicado de referencia: ${dto.referenceNumber}`);
                throw new BadRequestException('Este número de referencia ya ha sido utilizado.');
            }
            throw error;
        }
    }

    /**
     * Aprueba un pago manual y extiende la suscripción.
     * Actualiza también el estado a ACTIVE.
     */
    // En subscription.service.ts

    async approveManualPayment(businessId: string, paymentLogId: string, planType: 'SUBSCRIPTION' | 'LIFETIME' = 'SUBSCRIPTION') {

        // 1. Buscamos el log con la relación al negocio
        const log = await this.prisma.manualPaymentLog.findUnique({
            where: { id: paymentLogId },
            include: { business: true }
        });

        if (!log) throw new NotFoundException('Comprobante de pago no encontrado');

        // AJUSTE DE SEGURIDAD: Validar que el negocio exista antes de continuar
        if (!log.business) {
            throw new Error('El comprobante no tiene un negocio asociado en la base de datos');
        }

        const newExpiryDate = planType === 'LIFETIME'
            ? new Date(2099, 11, 31)
            : new Date(new Date().setMonth(new Date().getMonth() + 1));

        // 2. Transacción
        const result = await this.prisma.$transaction([
            this.prisma.subscription.upsert({
                where: { businessId },
                update: {
                    accessType: planType,
                    subscriptionStatus: 'ACTIVE',
                    currentPeriodEnd: newExpiryDate
                },
                create: {
                    businessId: businessId,
                    accessType: planType,
                    subscriptionStatus: 'ACTIVE',
                    currentPeriodEnd: newExpiryDate
                },
            }),
            this.prisma.manualPaymentLog.update({
                where: { id: paymentLogId },
                data: { status: 'APPROVED' },
            }),
        ]);

        // 3. Notificación al Cliente con DEBUGGING EXPLÍCITO
        try {
            const userEmail = log.business.email;
            const userName = log.business.name;

            console.log(`[DEBUG] Intentando enviar email a: ${userEmail} para el negocio: ${userName}`);

            if (!userEmail) {
                console.warn(`[WARN] El negocio ${userName} no tiene email configurado.`);
            }

            await this.emailService.sendPaymentStatusUpdate(
                userEmail || 'correo-no-disponible@ejemplo.com',
                userName || 'Usuario',
                'APPROVED'
            );

            console.log("[DEBUG] Email enviado correctamente desde producción");

        } catch (emailError) {
            console.error("[ERROR CRÍTICO] Fallo al enviar email en producción:", emailError);
        }

        return result;
    }
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleSubscriptionReminders() {
        this.logger.log('Ejecutando revisión de suscripciones próximas a vencer...');

        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

        // Buscamos suscripciones que vencen en ese rango de 24h
        const start = new Date(fiveDaysFromNow.setHours(0, 0, 0, 0));
        const end = new Date(fiveDaysFromNow.setHours(23, 59, 59, 999));

        const expiringSubs = await this.prisma.subscription.findMany({
            where: {
                currentPeriodEnd: { gte: start, lte: end },
                accessType: 'SUBSCRIPTION'
            },
            include: { business: true } // Asumiendo que tienes la relación en Prisma
        });

        for (const sub of expiringSubs) {
            await this.emailService.sendSubscriptionReminder(
                sub.business.email || 'correo@ejemplo.com',
                sub.business.name,
                sub.currentPeriodEnd
            );
        }
    }

    /**
     * Método auxiliar para inicializar el Trial al crear un negocio (7 días)
     */
    async createTrial(businessId: string) {
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 14);

        return await this.prisma.subscription.create({
            data: {
                businessId,
                accessType: 'TRIAL',
                currentPeriodEnd: trialExpiry,

            }
        });
    }

    // En src/subscription/subscription.service.ts

    async getPendingPayments() {
        return await this.prisma.manualPaymentLog.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                business: {
                    select: { name: true } // Solo traemos el nombre para optimizar
                }
            },
            orderBy: {
                createdAt: 'asc' // Los más antiguos primero
            }
        });
    }

    /**
     * Obtiene todos los negocios y su estado de suscripción desde la tabla Subscription
     */
    async getAllSubscriptions() {
        return await this.prisma.subscription.findMany({
            include: {
                business: {
                    select: { name: true }
                }
            }
        });
    }

    /**
      * Reactiva o actualiza el estado de una suscripción
      */
    async reactivateSubscription(businessId: string) {
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 30);

        // Incluimos el negocio para poder enviar el email
        const sub = await this.prisma.subscription.update({
            where: { businessId },
            data: {
                subscriptionStatus: 'ACTIVE',
                currentPeriodEnd: newEndDate
            },
            include: { business: true }
        });

        // Notificar al cliente
        await this.emailService.sendPaymentStatusUpdate(
            sub.business.email || 'correo-no-disponible@ejemplo.com',
            sub.business.name,
            'APPROVED'
        );

        return sub;
    }

    // Agrégalo a tu SubscriptionService
    async updatePlan(businessId: string, data: { accessType: 'SUBSCRIPTION' | 'LIFETIME', subscriptionStatus: 'ACTIVE' | 'CANCELED' }) {
        const newEndDate = data.accessType === 'LIFETIME'
            ? new Date(2099, 11, 31)
            : new Date(new Date().setMonth(new Date().getMonth() + 1));

        return await this.prisma.subscription.update({
            where: { businessId },
            data: {
                accessType: data.accessType,
                subscriptionStatus: data.subscriptionStatus,
                currentPeriodEnd: newEndDate
            }
        });
    }

    /**
     * Cambia el estado de la suscripción (usado por el Switch del Admin)
     */
    async toggleSubscriptionStatus(businessId: string, status: 'ACTIVE' | 'CANCELED') {
        // 1. Actualizamos y pedimos explícitamente el negocio relacionado
        const sub = await this.prisma.subscription.update({
            where: { businessId },
            data: {
                subscriptionStatus: status,
                currentPeriodEnd: status === 'ACTIVE'
                    ? new Date(new Date().setMonth(new Date().getMonth() + 1))
                    : new Date(),
            },
            include: { business: true } // ¡CRÍTICO! Esto debe estar aquí
        });

        // 2. Depuración: Si esto no aparece en tu consola, el servicio no se está ejecutando
        this.logger.log(`Intentando enviar correo a: ${sub.business?.email} para negocio: ${sub.business?.name}`);

        if (sub.business?.email) {
            await this.emailService.sendPaymentStatusUpdate(
                sub.business.email,
                sub.business.name,
                status === 'ACTIVE' ? 'APPROVED' : 'REJECTED'
            );
            this.logger.log("Correo enviado exitosamente.");
        } else {
            this.logger.error(`FALLO: El negocio ${businessId} no tiene email registrado.`);
        }

        return sub;
    }
}