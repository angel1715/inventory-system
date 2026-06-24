import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNcfSequenceDto } from './dto/create-ncf-sequence.dto';

@Injectable()
export class NcfService {
    constructor(private prisma: PrismaService) { }

    async createSequence(businessId: string, dto: CreateNcfSequenceDto) {
        // 1. Validar integridad del rango
        if (dto.endAt < dto.startAt) {
            throw new BadRequestException("El fin del rango no puede ser menor al inicio.");
        }

        // 2. Desactivar secuencias previas del mismo tipo (si existen)
        await this.prisma.ncfSequence.updateMany({
            where: { businessId, type: dto.type, active: true },
            data: { active: false }
        });

        // 3. Crear el nuevo rango
        return this.prisma.ncfSequence.create({
            data: {
                ...dto,
                businessId,
                prefix: 'B',
                current: dto.startAt,
                active: true,
            }
        });
    }

    async getSequences(businessId: string) {
        return this.prisma.ncfSequence.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' }
        });
    }
}