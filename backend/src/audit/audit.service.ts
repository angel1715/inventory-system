import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {

    constructor(
        private prisma: PrismaService,
    ) { }

    async log(
        userId: string,
        businessId: string,
        action: string,
        entity: string,
        entityId?: string,
        description?: string,
    ) {

        return this.prisma.auditLog.create({
            data: {
                userId,
                businessId,
                action,
                entity,
                entityId,
                description,
            },
        });
    }
}