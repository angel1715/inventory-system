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

    // ==========================================
    // APERTURA DE CAJA CHICA
    // ==========================================
    @Post("open")
    open(
        @Body() dto: OpenRegisterDto,
        @Request() req: any,
    ) {
        return this.cashService.openRegister(
            req.user.businessId,
            req.user.id,
            dto.openingAmount,
        );
    }

    // ==========================================
    // CIERRE DE CAJA CHICA (SOLO EL DUEÑO)
    // ==========================================
    @Roles("OWNER")
    @Post("close")
    close(
        @Body() dto: CloseRegisterDto,
        @Request() req: any,
    ) {
        return this.cashService.closeRegister(
            req.user.businessId,
            req.user.id,
            dto.actualCash,
            dto.note, // ✅ Ahora sí enviamos la nota al servicio
        );
    }


    // ==========================================
    // ESTADO DE LA SESIÓN EN DESARROLLO
    // ==========================================
    @Get("current")
    getCurrent(@Request() req: any) {
        return this.cashService.getCurrentSession(req.user.businessId);
    }

    // ==========================================
    // ARQUEO EN VIVO (MÉTODO CENTRALIZADO)
    // ==========================================
    @Get("summary")
    getSummary(@Request() req: any) {
        return this.cashService.getSummary(req.user.businessId);
    }

    // ==========================================
    // HISTORIAL DE SESIONES PASADAS
    // ==========================================
    @Get("history")
    getHistory(@Request() req: any) {
        return this.cashService.getHistory(req.user.businessId);
    }
}