import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { UpdateSettingsDto } from "./dto/create-settings.dto"; // Asegúrate de tener este DTO

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // GESTIÓN DE CONFIGURACIÓN FISCAL (Empresa)
    // ==========================================
    async getSettings(businessId: string) {
        let settings = await this.prisma.businessSettings.findFirst({ where: { businessId } });

        // Auto-crear si no existe
        if (!settings) {
            settings = await this.prisma.businessSettings.create({
                data: {
                    businessId,
                    businessName: "Mi Negocio",
                    currency: "DOP",
                    taxRate: 18,
                    invoiceFooter: "Gracias por su compra"
                }
            });
        }
        return settings;
    }

    async updateSettings(businessId: string, data: UpdateSettingsDto) {
        const existing = await this.prisma.businessSettings.findFirst({ where: { businessId } });

        if (!existing) {
            return await this.prisma.businessSettings.create({
                data: { businessId, ...data }
            });
        }

        return await this.prisma.businessSettings.update({
            where: { id: existing.id },
            data: {
                ...data,
                // Si envían un logo vacío, mantenemos el anterior
                logoUrl: data.logoUrl || existing.logoUrl
            }
        });
    }

    // ==========================================
    // GESTIÓN DE SECUENCIAS NCF
    // ==========================================
    async getSequences(businessId: string) {
        return await this.prisma.ncfSequence.findMany({
            where: { businessId },
            orderBy: { createdAt: "desc" }
        });
    }

    async createSequence(businessId: string, data: Prisma.NcfSequenceUncheckedCreateInput) {
        // 1. Limpiamos 'data' para asegurarnos de que no traiga la relación 'business'
        // que es la que está causando el conflicto de tipos
        const { business, ...cleanData } = data as any;

        if (cleanData.active) {
            await this.prisma.ncfSequence.updateMany({
                where: { businessId, type: cleanData.type },
                data: { active: false }
            });
        }

        return await this.prisma.ncfSequence.create({
            data: {
                ...cleanData,
                businessId
            }
        });
    }

    async activateSequence(id: string, businessId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const sequence = await tx.ncfSequence.findFirst({ where: { id, businessId } });
            if (!sequence) throw new NotFoundException("Secuencia no encontrada");

            // 1. Desactivar otras del mismo tipo
            await tx.ncfSequence.updateMany({
                where: { businessId, type: sequence.type },
                data: { active: false }
            });

            // 2. Activar la seleccionada
            return await tx.ncfSequence.update({
                where: { id },
                data: { active: true }
            });
        });
    }

    async deleteSequence(id: string, businessId: string) {
        const sequence = await this.prisma.ncfSequence.findFirst({ where: { id, businessId } });

        if (!sequence) throw new NotFoundException("Secuencia no encontrada");
        if (sequence.active) throw new BadRequestException("No puedes eliminar una secuencia activa.");

        return await this.prisma.ncfSequence.delete({ where: { id } });
    }
}