import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Req,
    UseGuards,
} from "@nestjs/common";

import { UsersService } from "./users.service";

import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

import { Role } from "@prisma/client";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

import { JwtAuthGuard } from "../auth/jwt.guard";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {

    constructor(
        private readonly usersService: UsersService,
    ) { }

    // =========================
    // GET ALL USERS
    // =========================
    @Get()
    @Roles(Role.OWNER)
    findAll(@Req() req: any) {

        return this.usersService.findAll(
            req.user.businessId,
        );
    }

    // =========================
    // GET ONE USER
    // =========================
    @Get(":id")
    @Roles(Role.OWNER)
    findOne(
        @Param("id") id: string,
        @Req() req: any,
    ) {

        return this.usersService.findOne(
            id,
            req.user.businessId,
        );
    }

    // =========================
    // CREATE USER
    // =========================
    @Post()
    @Roles(Role.OWNER)
    create(
        @Body() dto: CreateUserDto,
        @Req() req: any,
    ) {

        return this.usersService.create(
            dto,
            req.user.businessId,
        );
    }

    // =========================
    // UPDATE USER
    // =========================
    @Patch(":id")
    @Roles(Role.OWNER)
    update(
        @Param("id") id: string,
        @Body() dto: UpdateUserDto,
        @Req() req: any,
    ) {

        return this.usersService.update(
            id,
            dto,
            req.user.businessId,
        );
    }

    // =========================
    // TOGGLE ACTIVE
    // =========================
    @Patch(":id/toggle-active")
    @Roles(Role.OWNER)
    toggleActive(
        @Param("id") id: string,
        @Req() req: any,
    ) {

        return this.usersService.toggleActive(
            id,
            req.user.businessId,
            req.user.id,
        );
    }
}

