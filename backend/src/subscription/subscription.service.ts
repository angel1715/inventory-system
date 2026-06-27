import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
        return await this.prisma.manualPaymentLog.create({
            data: {
                businessId,
                amount: dto.amount,
                referenceNumber: dto.referenceNumber,
                receiptUrl: dto.receiptUrl,
                status: 'PENDING',
            },
        });
    }

    /**
     * Aprueba un pago manual y extiende la suscripción.
     * Actualiza también el estado a ACTIVE.
     */
    // En subscription.service.ts

    async approveManualPayment(businessId: string, paymentLogId: string, planType: 'SUBSCRIPTION' | 'LIFETIME' = 'SUBSCRIPTION') {
        const log = await this.prisma.manualPaymentLog.findUnique({
            where: { id: paymentLogId }
        });

        if (!log) throw new NotFoundException('Comprobante de pago no encontrado');

        if (planType === 'LIFETIME') {
            return await this.prisma.$transaction([
                this.prisma.subscription.update({
                    where: { businessId },
                    data: {
                        accessType: 'LIFETIME', // <--- Cambiamos el tipo a LIFETIME
                        subscriptionStatus: 'ACTIVE',
                        currentPeriodEnd: new Date(2099, 11, 31) // Fecha muy lejana
                    },
                }),
                this.prisma.manualPaymentLog.update({
                    where: { id: paymentLogId },
                    data: { status: 'APPROVED' },
                }),
            ]);
        }

        // Lógica original para suscripción mensual
        const sub = await this.prisma.subscription.findUnique({ where: { businessId } });
        if (!sub) throw new NotFoundException('Suscripción no encontrada para este negocio');
        const now = new Date();
        const baseDate = (sub.currentPeriodEnd > now) ? sub.currentPeriodEnd : now;
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + 30);

        return await this.prisma.$transaction([
            this.prisma.subscription.update({
                where: { businessId },
                data: {
                    accessType: 'SUBSCRIPTION',
                    currentPeriodEnd: newExpiry,
                    subscriptionStatus: 'ACTIVE',
                },
            }),
            this.prisma.manualPaymentLog.update({
                where: { id: paymentLogId },
                data: { status: 'APPROVED' },
            }),
        ]);
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
        trialExpiry.setDate(trialExpiry.getDate() + 7);

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
        newEndDate.setDate(newEndDate.getDate() + 30); // Sumar 30 días

        return await this.prisma.subscription.update({
            where: { businessId },
            data: {
                subscriptionStatus: 'ACTIVE',
                currentPeriodEnd: newEndDate
            }
        });
    }

    /**
     * Cambia el estado de la suscripción (usado por el Switch del Admin)
     */
    async toggleSubscriptionStatus(businessId: string, status: 'ACTIVE' | 'EXPIRED') {
        // 1. Definimos la fecha de vencimiento según la acción
        const newEndDate = status === 'ACTIVE'
            ? new Date(new Date().setMonth(new Date().getMonth() + 1))
            : new Date(); // Si es EXPIRED, la fecha es hoy

        // 2. Definimos el estado para la base de datos (mapeo de 'EXPIRED' a 'CANCELED')
        const dbStatus = status === 'ACTIVE' ? 'ACTIVE' : 'CANCELED';

        // 3. Ejecutamos la actualización
        return await this.prisma.subscription.update({
            where: { businessId },
            data: {
                subscriptionStatus: dbStatus,
                currentPeriodEnd: newEndDate
            }
        });
    }
}