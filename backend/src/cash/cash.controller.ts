import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Request,
} from "@nestjs/common";

import { CashService } from "./cash.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { OpenRegisterDto, CloseRegisterDto } from "./dto/cash.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";

@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller("cash")
export class CashController {
    constructor(private readonly cashService: CashService) { }

    // Apertura: cualquier rol (el empleado abre su turno)
    @Post("open")
    open(@Body() dto: OpenRegisterDto, @Request() req: any) {
        return this.cashService.openRegister(
            req.user.businessId,
            req.user.id,
            dto.openingAmount,
        );
    }

    // Cierre: quien la abrió, o el dueño / admin (se valida en el service)
    @Post("close")
    close(@Body() dto: CloseRegisterDto, @Request() req: any) {
        return this.cashService.closeRegister(
            req.user.businessId,
            req.user.id,
            req.user.role,
            dto.actualCash,
            dto.note,
        );
    }

    @Get("current")
    getCurrent(@Request() req: any) {
        return this.cashService.getCurrentSession(req.user.businessId);
    }

    @Get("summary")
    getSummary(@Request() req: any) {
        return this.cashService.getSummary(req.user.businessId);
    }

    // El historial de turnos, con montos y diferencias, solo para el dueño
    @Roles("OWNER")
    @Get("history")
    getHistory(@Request() req: any) {
        return this.cashService.getHistory(req.user.businessId);
    }
}