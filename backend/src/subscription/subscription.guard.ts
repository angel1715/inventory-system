import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const path = request.route.path;

        // Permitimos acceso a la ruta de pricing para evitar bucles de redirección
        if (path === '/subscription/pricing') return true;

        const subscription = await this.prisma.subscription.findUnique({
            where: { businessId: user.businessId },
        });

        const isExpired = subscription?.currentPeriodEnd
            ? new Date() > subscription.currentPeriodEnd
            : true;

        if (!subscription || subscription.status !== 'ACTIVE' || isExpired) {
            throw new ForbiddenException('Suscripción inactiva o vencida. Por favor, renueva tu plan.');
        }

        return true;
    }
}