import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StripeWebhookService {
    private readonly logger = new Logger(StripeWebhookService.name);

    constructor(private prisma: PrismaService) { }

    async handleEvent(event: any) {
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                default:
                    this.logger.log(`Evento omitido: ${event.type}`);
            }
        } catch (error: any) {
            this.logger.error(`Error en Webhook ${event.type}: ${error.message}`);
            throw error;
        }
    }

    private async handleCheckoutCompleted(session: any) {
        const businessId = session.metadata?.businessId;
        const stripeCustomerId = session.customer as string;

        if (!businessId) {
            this.logger.error('No se recibió businessId en los metadatos de Stripe');
            return;
        }

        // Unificamos la actualización del usuario en una sola consulta
        await this.prisma.user.updateMany({
            where: { businessId },
            data: {
                active: true,
                stripeCustomerId: stripeCustomerId
            }
        });

        // 2. Creamos o actualizamos la suscripción
        await this.prisma.subscription.upsert({
            where: { businessId },
            update: {
                status: SubscriptionStatus.ACTIVE,
                stripeSubscriptionId: session.subscription,
            },
            create: {
                businessId,
                status: SubscriptionStatus.ACTIVE,
                plan: 'PRO_PLAN',
                stripeSubscriptionId: session.subscription,
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        this.logger.log(`¡Éxito! Suscripción y acceso activado para negocio: ${businessId}`);
    }

    private async handleSubscriptionUpdated(sub: any) {
        const statusMap: Record<string, SubscriptionStatus> = {
            active: SubscriptionStatus.ACTIVE,
            past_due: SubscriptionStatus.PAST_DUE,
            canceled: SubscriptionStatus.CANCELED,
            incomplete: SubscriptionStatus.INCOMPLETE,
            incomplete_expired: SubscriptionStatus.INCOMPLETE,
            trialing: SubscriptionStatus.ACTIVE
        };

        const newStatus = statusMap[sub.status] || SubscriptionStatus.CANCELED;

        // Si la suscripción se cancela, desactivamos al usuario
        const isInactive = newStatus === SubscriptionStatus.CANCELED || newStatus === SubscriptionStatus.INCOMPLETE;

        await this.prisma.subscription.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: {
                status: newStatus,
                currentPeriodEnd: new Date(sub.current_period_end * 1000)
            },
        });

        // Sincronizamos el estado del usuario en base al status de la suscripción
        const subRecord = await this.prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (subRecord) {
            await this.prisma.user.updateMany({
                where: { businessId: subRecord.businessId },
                data: { active: !isInactive }
            });
        }

        this.logger.log(`Suscripción ${sub.id} actualizada a: ${newStatus}. Usuario activo: ${!isInactive}`);
    }
}