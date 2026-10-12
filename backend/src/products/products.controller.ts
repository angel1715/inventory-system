import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Patch,
    Query,
    UseGuards,
    UseInterceptors,
    Request,
} from "@nestjs/common";

import { ProductsService } from "./products.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateStockDto } from "./dto/update-stock.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { HideCostInterceptor } from "../common/hide-cost.interceptor";

// Leer productos y seriales: todos los roles (POS y repuestos de reparaciones).
// Crear, editar, mover stock y ver recomendaciones de compra: solo dueño.
// HideCostInterceptor quita el costo de las respuestas para quien no sea dueño o admin.
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@UseInterceptors(HideCostInterceptor)
@Controller("products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Roles("OWNER")
    @Post()
    create(@Body() dto: CreateProductDto, @Request() req: any) {
        return this.productsService.create(dto, req.user.businessId);
    }

    @Get()
    findAll(@Request() req: any, @Query("search") search?: string) {
        if (search) {
            return this.productsService.search(search, req.user.businessId);
        }

        return this.productsService.findAll(req.user.businessId);
    }

    @Get("search")
    search(@Query("q") query: string, @Request() req: any) {
        return this.productsService.search(query, req.user.businessId);
    }

    @Roles("OWNER")
    @Get("low-stock")
    getLowStockProducts(@Request() req: any) {
        return this.productsService.getLowStockProducts(req.user.businessId);
    }

    @Roles("OWNER")
    @Get("auto-purchases")
    autoPurchases(@Request() req: any) {
        return this.productsService.generateAutoPurchases(req.user.businessId);
    }

    @Roles("OWNER")
    @Get("purchase-recommendations")
    getPurchaseRecommendations(@Request() req: any) {
        return this.productsService.getPurchaseRecommendations(req.user.businessId);
    }

    @Get("barcode/:code")
    findByBarcode(@Param("code") code: string, @Request() req: any) {
        return this.productsService.findByBarcode(code, req.user.businessId);
    }

    // Escaneo directo de un IMEI / serial en el POS
    @Get("serials/:serial/available")
    getSingleAvailableSerial(@Param("serial") serial: string, @Request() req: any) {
        return this.productsService.getSingleAvailableSerial(serial, req.user.businessId);
    }

    @Get(":id/serials")
    getAvailableSerialsByProduct(@Param("id") productId: string, @Request() req: any) {
        return this.productsService.getAvailableSerialsByProduct(productId, req.user.businessId);
    }

    @Get(":id")
    findOne(@Param("id") id: string, @Request() req: any) {
        return this.productsService.findOne(id, req.user.businessId);
    }

    // El cuerpo sigue siendo "any" a propósito: el service ya aplica una lista blanca de campos
    @Roles("OWNER")
    @Patch(":id")
    update(@Param("id") id: string, @Body() data: any, @Request() req: any) {
        return this.productsService.update(id, data, req.user.businessId);
    }

    @Roles("OWNER")
    @Patch(":id/stock")
    updateStock(@Param("id") id: string, @Body() dto: UpdateStockDto, @Request() req: any) {
        return this.productsService.updateStock(id, dto.quantity, req.user.businessId, dto.note);
    }

    @Roles("OWNER")
    @Patch(":id/toggle")
    toggle(@Param("id") id: string, @Request() req: any) {
        return this.productsService.toggleActive(id, req.user.businessId);
    }
}