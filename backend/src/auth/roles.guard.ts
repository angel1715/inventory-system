
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
        const requiredRoles =
            this.reflector.getAllAndOverride<string[]>(
                ROLES_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ]
            );

        // ✅ Si no hay roles requeridos,
        // permitir acceso
        if (!requiredRoles?.length) {
            return true;
        }

        const request =
            context
                .switchToHttp()
                .getRequest();

        const user = request.user;

        // ✅ Si no hay usuario autenticado
        if (!user) {
            return false;
        }

        // ✅ Validar rol
        return requiredRoles.includes(
            user.role
        );
    }
}

