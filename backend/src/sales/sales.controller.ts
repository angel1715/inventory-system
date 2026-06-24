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
} from "@nestjs/common";

import { SalesService } from "./sales.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller("sales")
export class SalesController {
    constructor(private salesService: SalesService) { }

    // =========================
    // NEW DASHBOARD (MAIN) - Ruta estática arriba
    // =========================
    @Get("dashboard")
    getDashboard(
        @Request() req,
        @Query("range") range: "today" | "week" | "month" = "today",
    ) {
        return this.salesService.getDashboard(
            req.user.businessId,
            range,
        );
    }

    // =========================
    // LEGACY DASHBOARD - Ruta estática arriba
    // =========================
    @Get("dashboard/stats")
    getDashboardStats(@Request() req) {
        return this.salesService.getDashboardStats(
            req.user.businessId,
        );
    }

   // =========================
// SALES LIST - Ruta actualizada
// =========================
@Get()
findAll(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search", new DefaultValuePipe("")) search: string,
    // Nuevos parámetros de filtro
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

@Get('export')
exportAll(@Request() req, @Query("paymentMethod") paymentMethod: string, @Query("dateRange") dateRange: string) {
    return this.salesService.exportAll(
        req.user.businessId,
        paymentMethod,
        dateRange
    );
}

    // =========================
    // CREATE SALE
    // =========================
    @Post()
    createSale(
        @Body() dto: CreateSaleDto & { initialPayment?: number }, // 👈 Agregamos la intersección aquí
        @Request() req: any
    ) {
        return this.salesService.createSale(
            dto,
            req.user.id,
            req.user.businessId,
        );
    }

    // =========================
    // INVOICE - Rutas dinámicas abajo
    // =========================
    @Get(":id/invoice")
    invoice(@Param("id") id: string, @Request() req) {
        return this.salesService.getInvoice(
            id,
            req.user.businessId,
        );
    }

    // =========================
    // SINGLE SALE - Rutas dinámicas abajo
    // =========================
    @Get(":id")
    findOne(@Param("id") id: string, @Request() req) {
        return this.salesService.findOne(
            id,
            req.user.businessId,
        );
    }
}