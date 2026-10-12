import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    UseGuards,
} from "@nestjs/common";

import { PurchasesService } from "./purchases.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreatePurchaseDto } from "./dto/create-purchase.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";

// Las compras mueven dinero e inventario: solo el dueño
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles("OWNER")
@Controller("purchases")
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    create(@Body() dto: CreatePurchaseDto, @Req() req: any) {
        return this.purchasesService.create(dto, req.user.businessId, req.user.id);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.purchasesService.findAll(req.user.businessId);
    }

    // Debe ir antes de ":id", si no Nest tomaría "auto-generate" como un id
    @Get("auto-generate")
    autoGenerate(@Req() req: any) {
        return this.purchasesService.generateAutoPurchaseDrafts(req.user.businessId);
    }

    @Get(":id")
    findOne(@Param("id") id: string, @Req() req: any) {
        return this.purchasesService.findOne(id, req.user.businessId);
    }
}