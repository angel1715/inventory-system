import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Asumiendo que ya tienes un PrismaModule global
import { StripeWebhookService } from './stripe.webhook.service';

@Module({
    imports: [PrismaModule],
    controllers: [SubscriptionController],
    providers: [SubscriptionService, StripeWebhookService],
    exports: [SubscriptionService], // Lo exportamos por si en el futuro necesitas validar suscripciones desde otros servicios
})
export class SubscriptionModule { }