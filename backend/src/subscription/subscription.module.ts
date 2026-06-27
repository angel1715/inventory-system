import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionCronService } from './subscription.cron.service';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [PrismaModule, EmailModule],
    controllers: [SubscriptionController],
    // SubscriptionService debe estar aquí para que el módulo lo "posea"
    providers: [SubscriptionService, SubscriptionCronService],
    // Ahora sí puede exportarlo porque ya lo tiene registrado en providers
    exports: [SubscriptionService]
})
export class SubscriptionModule { }