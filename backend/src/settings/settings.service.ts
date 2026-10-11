import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { UpdateSettingsDto } from "./dto/create-settings.dto"; // Asegúrate de tener este DTO
import { UpdateNcfSequenceDto } from "./dto/update-ncf-sequence.dto";

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // GESTIÓN DE CONFIGURACIÓN FISCAL (Empresa)
    // ==========================================
        async getSettings(businessId: string, role?: string) {
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

        // Llamadas internas (sin rol): configuración completa
        if (role === undefined) return settings;

        // Credenciales del conector e-CF: solo dueño y admin
        const { ecfApiKey, ecfBaseUrl, ecfTaxId, ...safe } = settings;

        if (role !== "OWNER" && role !== "ADMIN") return safe;

        return {
            ...safe,
            ecfBaseUrl,
            ecfTaxId,
            // La clave nunca viaja completa al navegador
            ecfApiKey: ecfApiKey ? `••••${ecfApiKey.slice(-4)}` : null,
        };
    }

    async updateSettings(businessId: string, data: UpdateSettingsDto) {
        // Si la clave llega vacía o enmascarada (••••1234) no se cambió: se conserva la guardada
        const { ecfApiKey, ...rest } = data as any;
        const keyChanged =
            typeof ecfApiKey === "string" &&
            ecfApiKey.trim() !== "" &&
            !ecfApiKey.startsWith("••");
        const keyData = keyChanged ? { ecfApiKey: ecfApiKey.trim() } : {};

        const existing = await this.prisma.businessSettings.findFirst({ where: { businessId } });

        if (!existing) {
            return await this.prisma.businessSettings.create({
                data: { businessId, ...rest, ...keyData }
            });
        }

        return await this.prisma.businessSettings.update({
            where: { id: existing.id },
            data: {
                ...rest,
                ...keyData,
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
        const raw = data as any;

        const type = String(raw.type ?? "").trim();
        const prefix = String(raw.prefix ?? "").trim();
        const startAt = Number(raw.startAt);
        const endAt = Number(raw.endAt);
        const expiryDate = new Date(raw.expiryDate);

        if (!type || !prefix) {
            throw new BadRequestException("El tipo y el prefijo son obligatorios.");
        }
        if (!Number.isInteger(startAt) || !Number.isInteger(endAt) || startAt < 1 || endAt < startAt) {
            throw new BadRequestException("El rango de la secuencia no es válido.");
        }
        if (isNaN(expiryDate.getTime())) {
            throw new BadRequestException("La fecha de vencimiento no es válida.");
        }

        const current = raw.current !== undefined ? Number(raw.current) : startAt;
        if (!Number.isInteger(current) || current < startAt || current > endAt + 1) {
            throw new BadRequestException("El número actual no está dentro del rango.");
        }

        if (raw.active) {
            await this.prisma.ncfSequence.updateMany({
                where: { businessId, type },
                data: { active: false }
            });
        }

        // Solo los campos esperados: nada más del cuerpo llega a la base de datos
        return await this.prisma.ncfSequence.create({
            data: {
                businessId,
                type,
                prefix,
                startAt,
                endAt,
                current,
                expiryDate,
                active: !!raw.active,
            }
        });
    }

    async updateSequence(id: string, businessId: string, data: UpdateNcfSequenceDto) {
        const sequence = await this.prisma.ncfSequence.findFirst({ where: { id, businessId } });
        if (!sequence) throw new NotFoundException("Secuencia no encontrada");

        const nextEndAt = data.endAt ?? sequence.endAt;
        const nextCurrent = data.current ?? sequence.current;

        if (nextCurrent < sequence.startAt) {
            throw new BadRequestException("El número actual no puede ser menor que el inicio del rango.");
        }
        if (nextCurrent > nextEndAt + 1) {
            throw new BadRequestException("El número actual no puede superar el fin del rango.");
        }
        if (nextEndAt < sequence.startAt) {
            throw new BadRequestException("El fin del rango no puede ser menor que el inicio.");
        }
        if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
            throw new BadRequestException("La fecha de vencimiento no puede estar en el pasado.");
        }

        return await this.prisma.ncfSequence.update({
            where: { id },
            data: {
                ...(data.current !== undefined && { current: data.current }),
                ...(data.endAt !== undefined && { endAt: data.endAt }),
                ...(data.expiryDate !== undefined && { expiryDate: new Date(data.expiryDate) }),
            },
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