import {
    Controller,
    Get,
    UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt.guard";
import { PrismaService } from "../prisma/prisma.service";
import { GetUser } from "../auth/decorators/get-user.decorator"; // Asegúrate de importar tu decorador

@Controller("audit")
@UseGuards(JwtAuthGuard)
export class AuditController {

    constructor(
        private prisma: PrismaService,
    ) { }

    @Get()
    async findAll(
        @GetUser() user: any, // Inyección limpia del usuario desde el token
    ) {
        return this.prisma.auditLog.findMany({
            where: {
                businessId: user.businessId, // Filtrado automático y seguro
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });
    }
}