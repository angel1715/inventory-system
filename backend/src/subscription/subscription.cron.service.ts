import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service'; // Asegúrate de importar el tuyo

@Injectable()
export class SubscriptionCronService {
    private readonly logger = new Logger(SubscriptionCronService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService // <--- Usamos tu servicio personalizado
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleSubscriptionReminders() {
        this.logger.log('Iniciando recordatorios de pago automáticos...');

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);

        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const expiring = await this.prisma.subscription.findMany({
            where: {
                accessType: 'SUBSCRIPTION',
                currentPeriodEnd: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: { business: true },
        });

        for (const sub of expiring) {
            if (sub.business.email) {
                // Ahora usamos tu método personalizado
                await this.emailService.sendSubscriptionReminder(
                    sub.business.email,
                    sub.business.name,
                    sub.currentPeriodEnd
                );
                this.logger.log(`Recordatorio enviado a: ${sub.business.email}`);
            }
        }
    }
}