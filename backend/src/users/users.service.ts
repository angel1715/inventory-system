import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {

    constructor(
        private prisma: PrismaService,
    ) { }

    // =========================
    // GET ALL USERS
    // =========================
    async findAll(businessId: string) {

        return this.prisma.user.findMany({
            where: {
                businessId,
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true,
            },

            orderBy: {
                createdAt: "desc",
            },
        });
    }

    // =========================
    // GET ONE USER
    // =========================
    async findOne(
        id: string,
        businessId: string,
    ) {

        const user =
            await this.prisma.user.findFirst({
                where: {
                    id,
                    businessId,
                },

                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    active: true,
                    createdAt: true,
                },
            });

        if (!user) {
            throw new NotFoundException(
                "User not found",
            );
        }

        return user;
    }

    // =========================
    // CREATE USER
    // =========================
    async create(
        dto: CreateUserDto,
        businessId: string,
    ) {

        const exists =
            await this.prisma.user.findUnique({
                where: {
                    email: dto.email.toLowerCase(),
                },
            });

        if (exists) {
            throw new BadRequestException(
                "Email already exists",
            );
        }

        const hashedPassword =
            await bcrypt.hash(dto.password, 10);

        return this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email.toLowerCase(),
                password: hashedPassword,
                role: dto.role,
                businessId,
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true,
            },
        });
    }

    // =========================
    // UPDATE USER
    // =========================
    async update(
        id: string,
        dto: UpdateUserDto,
        businessId: string,
    ) {

        const user =
            await this.prisma.user.findFirst({
                where: {
                    id,
                    businessId,
                },
            });

        if (!user) {
            throw new NotFoundException(
                "User not found",
            );
        }

        if (
            dto.email &&
            dto.email.toLowerCase() !== user.email
        ) {

            const emailExists =
                await this.prisma.user.findUnique({
                    where: {
                        email: dto.email.toLowerCase(),
                    },
                });

            if (emailExists) {
                throw new BadRequestException(
                    "Email already exists",
                );
            }
        }

        let hashedPassword: string | undefined;

        if (dto.password) {
            hashedPassword =
                await bcrypt.hash(dto.password, 10);
        }

        return this.prisma.user.update({
            where: {
                id,
            },

            data: {
                name: dto.name,
                email: dto.email?.toLowerCase(),
                role: dto.role,

                ...(hashedPassword && {
                    password: hashedPassword,
                }),
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true,
            },
        });
    }

    // =========================
    // TOGGLE ACTIVE
    // =========================
    async toggleActive(
        id: string,
        businessId: string,
        currentUserId: string,
    ) {

        const user =
            await this.prisma.user.findFirst({
                where: {
                    id,
                    businessId,
                },
            });

        if (!user) {
            throw new NotFoundException(
                "User not found",
            );
        }

        // 🔥 NO SELF DISABLE
        if (user.id === currentUserId) {
            throw new BadRequestException(
                "You cannot disable yourself",
            );
        }

        // 🔥 PROTECT LAST OWNER
        if (
            user.role === "OWNER" &&
            user.active
        ) {

            const owners =
                await this.prisma.user.count({
                    where: {
                        businessId,
                        role: "OWNER",
                        active: true,
                    },
                });

            if (owners <= 1) {
                throw new BadRequestException(
                    "Cannot disable the last OWNER",
                );
            }
        }

        return this.prisma.user.update({
            where: {
                id,
            },

            data: {
                active: !user.active,
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
            },
        });
    }
}

