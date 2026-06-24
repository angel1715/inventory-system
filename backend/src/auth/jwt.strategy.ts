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
        // FIND USER
        const user =
            await this.prisma.user.findUnique({
                where: {
                    id: payload.sub,
                },
            });

        // USER NOT FOUND
        if (!user) {
            throw new UnauthorizedException(
                "User no longer exists"
            );
        }

        // DISABLED USER
        if (!user.active) {
            throw new UnauthorizedException(
                "User account disabled"
            );
        }

        // SAFE USER OBJECT (FIXED)
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            businessId: user.businessId,
        };
    }
}