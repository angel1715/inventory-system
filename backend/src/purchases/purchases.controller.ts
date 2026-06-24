import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    Request,
    UseGuards,
} from "@nestjs/common";

import { PurchasesService } from "./purchases.service";

import { JwtAuthGuard } from "../auth/jwt.guard";

import { CreatePurchaseDto } from "./dto/create-purchase.dto";

@UseGuards(JwtAuthGuard)
@Controller("purchases")
export class PurchasesController {

    constructor(
        private readonly purchasesService: PurchasesService,
    ) { }

    // =========================
    // CREATE PURCHASE
    // =========================
    @Post()
    create(
        @Body() dto: CreatePurchaseDto,
        @Req() req: any,
    ) {

        return this.purchasesService.create(
            dto,
            req.user.businessId,
            req.user.id,
        );
    }

    // =========================
    // GET PURCHASES
    // =========================
    @Get()
    findAll(@Req() req: any) {

        return this.purchasesService.findAll(
            req.user.businessId,
        );
    }

    @Get("auto-generate")
    async autoGenerate(@Request() req: any) {
        return this.purchasesService.generateAutoPurchaseDrafts(
            req.user.businessId,
        );
    }

    @Get(":id")
    findOne(
        @Param("id") id: string,
        @Req() req: any,
    ) {

        return this.purchasesService.findOne(
            id,
            req.user.businessId,
        );
    }




}

