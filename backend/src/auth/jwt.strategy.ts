import {
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";

import { PassportStrategy }
    from "@nestjs/passport";

import {
    ExtractJwt,
    Strategy,
} from "passport-jwt";

import { ConfigService }
    from "@nestjs/config";

import { PrismaService }
    from "../prisma/prisma.service";

@Injectable()
export class JwtStrategy
    extends PassportStrategy(Strategy)
{
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService
    ) {
        super({
            jwtFromRequest:
                ExtractJwt.fromAuthHeaderAsBearerToken(),

            ignoreExpiration: false,

            secretOrKey:
                configService.getOrThrow<string>(
                    "JWT_SECRET"
                ),
        });
    }

       async validate(payload: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                businessId: true,
                active: true,
                business: { select: { active: true } },
            },
        });

        if (!user) {
            throw new UnauthorizedException("User no longer exists");
        }

        if (!user.active) {
            throw new UnauthorizedException("User account disabled");
        }

        // Negocio suspendido: ningún usuario suyo puede operar
        if (user.business && user.business.active === false) {
            throw new UnauthorizedException("Business disabled");
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            businessId: user.businessId,
        };
    }
}