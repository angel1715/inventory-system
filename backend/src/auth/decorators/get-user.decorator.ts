import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para extraer el usuario desde el objeto 'request'.
 * Asume que el AuthGuard (JWT) ya procesó la petición y adjuntó el usuario al request.
 */
export const GetUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        // Si pasas un campo específico (ej: @GetUser('businessId')), devuelve solo eso.
        // Si no, devuelve el objeto de usuario completo.
        return data ? user?.[data] : user;
    },
);