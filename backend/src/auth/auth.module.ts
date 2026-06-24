import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { EmailModule } from "../email/email.module"; // <--- AQUÍ ESTÁ LA IMPORTACIÓN

@Module({
    imports: [
        ConfigModule,
        EmailModule, // <--- AQUÍ ESTÁ EL REGISTRO DEL MÓDULO
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>("JWT_SECRET") || "fallback-secret",
                signOptions: {
                    expiresIn: "7d",
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PrismaService,
        JwtStrategy,
    ],
    exports: [
        AuthService,
        JwtModule,
    ],
})
export class AuthModule { } // <--- EL EXPORT QUE SOLUCIONARÁ TU ERROR