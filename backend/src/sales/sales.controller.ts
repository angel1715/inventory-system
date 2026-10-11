import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
    Request,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    UseInterceptors
} from "@nestjs/common";

import { HideCostInterceptor } from "../common/hide-cost.interceptor";

import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@UseInterceptors(HideCostInterceptor)
@Controller("sales")
export class SalesController {
    constructor(private salesService: SalesService) { }

    // Métricas, historial y reportes: solo dueño (el ADMIN pasa siempre)
    @Roles("OWNER")
    @Get("dashboard")
    getDashboard(
        @Request() req,
        @Query("startDate") startDate?: string,
        @Query("endDate") endDate?: string,
    ) {
        return this.salesService.getDashboard(req.user.businessId, startDate, endDate);
    }

    @Roles("OWNER")
    @Get("metrics")
    async getMetrics(
        @Request() req,
        @Query("startDate") startDate: string,
        @Query("endDate") endDate: string,
    ) {
        return this.salesService.getMetrics(req.user.businessId, startDate, endDate);
    }

    @Roles("OWNER")
    @Get("dashboard/stats")
    getDashboardStats(@Request() req) {
        return this.salesService.getDashboardStats(req.user.businessId);
    }

    // limit = 0 significa "todas las ventas del filtro"
    @Roles("OWNER")
    @Get()
    findAll(
        @Request() req,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query("search", new DefaultValuePipe("")) search: string,
        @Query("paymentMethod", new DefaultValuePipe("ALL")) paymentMethod: string,
        @Query("dateRange", new DefaultValuePipe("ALL")) dateRange: string,
    ) {
        return this.salesService.findAll(
            req.user.businessId,
            page,
            limit,
            search,
            paymentMethod,
            dateRange,
        );
    }

    @Roles("OWNER")
    @Get("export")
    exportAll(
        @Request() req,
        @Query("paymentMethod") paymentMethod?: string,
        @Query("dateRange") dateRange?: string,
        @Query("startDate") startDate?: string,
        @Query("endDate") endDate?: string,
    ) {
        return this.salesService.exportAll(
            req.user.businessId,
            paymentMethod,
            dateRange,
            startDate,
            endDate,
        );
    }

    // Crear venta: cualquier rol (el cajero cobra)
    @Post()
    createSale(
        @Body() dto: CreateSaleDto & { initialPayment?: number },
        @Request() req: any
    ) {
        return this.salesService.createSale(dto, req.user.id, req.user.businessId);
    }

    @Get(":id/invoice")
    invoice(@Param("id") id: string, @Request() req) {
        return this.salesService.getInvoice(id, req.user.businessId);
    }

    @Get(":id")
    findOne(@Param("id") id: string, @Request() req) {
        return this.salesService.findOne(id, req.user.businessId);
    }
}