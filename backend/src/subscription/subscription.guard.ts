import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Inject
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(
        private readonly subscriptionService: SubscriptionService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user; // Asumiendo que tu AuthGuard ya inyectó el usuario

        // 1. Si no hay usuario, denegamos el acceso
        if (!user || !user.businessId) {
            throw new ForbiddenException('No autorizado: Negocio no identificado');
        }

        // 2. Verificamos el acceso mediante nuestro servicio centralizado
        const hasAccess = await this.subscriptionService.hasActiveAccess(user.businessId);

        if (!hasAccess) {
            throw new ForbiddenException('Tu suscripción ha expirado o no está activa. Por favor, realiza tu pago.');
        }

        return true;
    }
}