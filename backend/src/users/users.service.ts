import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";

import { Prisma, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

type Caller = { id: string; role: string };

const userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    active: true,
    createdAt: true,
} as const;

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // El rol ADMIN opera toda la plataforma: solo otro ADMIN puede verlo, crearlo o modificarlo.
    private visibleRoles(caller: Caller): Prisma.UserWhereInput {
        return caller.role === Role.ADMIN ? {} : { role: { not: Role.ADMIN } };
    }

    private async findManageable(id: string, businessId: string, caller: Caller) {
        const user = await this.prisma.user.findFirst({ where: { id, businessId } });

        // Para quien no es ADMIN, un usuario ADMIN "no existe"
        if (!user || (user.role === Role.ADMIN && caller.role !== Role.ADMIN)) {
            throw new NotFoundException("Usuario no encontrado.");
        }

        return user;
    }

    private async assertNotLastOwner(businessId: string, excludingUserId: string) {
        const otherOwners = await this.prisma.user.count({
            where: {
                businessId,
                role: Role.OWNER,
                active: true,
                id: { not: excludingUserId },
            },
        });

        if (otherOwners === 0) {
            throw new BadRequestException(
                "Debe quedar al menos un dueño activo en el negocio.",
            );
        }
    }

    private mapUniqueError(error: unknown): unknown {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return new BadRequestException("Ya existe un usuario con ese correo.");
        }
        return error;
    }

    // =========================
    // GET ALL USERS
    // =========================
    async findAll(businessId: string, caller: Caller) {
        return this.prisma.user.findMany({
            where: { businessId, ...this.visibleRoles(caller) },
            select: userSelect,
            orderBy: { createdAt: "desc" },
        });
    }

    // Lista mínima para elegir técnico en las órdenes
    async findTechnicians(businessId: string) {
        return this.prisma.user.findMany({
            where: { businessId, active: true, role: { not: Role.ADMIN } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
    }

    // =========================
    // GET ONE USER
    // =========================
    async findOne(id: string, businessId: string, caller: Caller) {
        const user = await this.prisma.user.findFirst({
            where: { id, businessId, ...this.visibleRoles(caller) },
            select: userSelect,
        });

        if (!user) {
            throw new NotFoundException("Usuario no encontrado.");
        }

        return user;
    }

    // =========================
    // CREATE USER
    // =========================
    async create(dto: CreateUserDto, businessId: string, caller: Caller) {
        if (dto.role === Role.ADMIN && caller.role !== Role.ADMIN) {
            throw new ForbiddenException("No puedes asignar el rol ADMIN.");
        }

        const email = dto.email.trim().toLowerCase();

        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) {
            throw new BadRequestException("Ya existe un usuario con ese correo.");
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        try {
            return await this.prisma.user.create({
                data: {
                    name: dto.name.trim(),
                    email,
                    password: hashedPassword,
                    role: dto.role,
                    businessId,
                },
                select: userSelect,
            });
        } catch (error) {
            throw this.mapUniqueError(error);
        }
    }

    // =========================
    // UPDATE USER
    // =========================
    async update(id: string, dto: UpdateUserDto, businessId: string, caller: Caller) {
        const user = await this.findManageable(id, businessId, caller);

        if (dto.role === Role.ADMIN && caller.role !== Role.ADMIN) {
            throw new ForbiddenException("No puedes asignar el rol ADMIN.");
        }

        if (dto.role && dto.role !== user.role) {
            if (user.id === caller.id) {
                throw new BadRequestException("No puedes cambiar tu propio rol.");
            }

            if (user.role === Role.OWNER && user.active) {
                await this.assertNotLastOwner(businessId, user.id);
            }
        }

        const email = dto.email?.trim().toLowerCase();

        if (email && email !== user.email) {
            const taken = await this.prisma.user.findUnique({ where: { email } });
            if (taken) {
                throw new BadRequestException("Ya existe un usuario con ese correo.");
            }
        }

        const hashedPassword = dto.password
            ? await bcrypt.hash(dto.password, 10)
            : undefined;

        try {
            return await this.prisma.user.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name.trim() }),
                    ...(email && { email }),
                    ...(dto.role && { role: dto.role }),
                    ...(hashedPassword && { password: hashedPassword }),
                },
                select: userSelect,
            });
        } catch (error) {
            throw this.mapUniqueError(error);
        }
    }

    // =========================
    // TOGGLE ACTIVE
    // =========================
    async toggleActive(id: string, businessId: string, caller: Caller) {
        const user = await this.findManageable(id, businessId, caller);

        if (user.id === caller.id) {
            throw new BadRequestException("No puedes deshabilitarte a ti mismo.");
        }

        if (user.role === Role.OWNER && user.active) {
            await this.assertNotLastOwner(businessId, user.id);
        }

        return this.prisma.user.update({
            where: { id },
            data: { active: !user.active },
            select: { id: true, name: true, email: true, role: true, active: true },
        });
    }
}