import {
    Injectable,
    CanActivate,
    ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector
    ) { }

    canActivate(
        context: ExecutionContext
    ): boolean {
        // 1. Obtener los roles definidos en el decorador del controlador o método
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ]
        );

        // 2. Si no hay roles requeridos, permitir acceso a todos (público)
        if (!requiredRoles?.length) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 3. Si no hay usuario autenticado, denegar acceso
        if (!user) {
            return false;
        }

        // 4. Lógica de "Super Usuario" (ADMIN)
        // Si el usuario es ADMIN, le damos acceso total inmediatamente.
        // Esto evita tener que agregar 'ADMIN' a todos tus decoradores.
        if (user.role === "ADMIN") {
            return true;
        }

        // 5. Validar rol específico para OWNER o cualquier otro rol definido
        return requiredRoles.includes(user.role);
    }
}