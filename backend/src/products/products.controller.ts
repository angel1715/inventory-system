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
    Req,
} from "@nestjs/common";

import { ProductsService } from "./products.service";


import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { RolesGuard } from "../auth/roles.guard";
import { HideCostInterceptor } from "../common/hide-cost.interceptor";

@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@UseInterceptors(HideCostInterceptor)
@Controller("products")
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
    ) { }

    // ======================
    // CREATE PRODUCT
    // ======================
    @Post()
    @Roles("OWNER")
    create(
        @Body() dto: CreateProductDto,
        @Request() req: any,
    ) {
        return this.productsService.create(
            dto,
            req.user.businessId,
        );
    }

    // ======================
    // GET ALL PRODUCTS
    // ======================
    @Get()
    findAll(
        @Request() req: any,

        @Query("search")
        search?: string,
    ) {

        if (search) {
            return this.productsService.search(
                search,
                req.user.businessId,
            );
        }

        return this.productsService.findAll(
            req.user.businessId,
        );
    }

    @Get("search")
    search(
        @Query("q") query: string,
        @Req() req: any,
    ) {
        return this.productsService.search(
            query,
            req.user.businessId,
        );
    }

    @Get("low-stock")
    getLowStockProducts(
        @Request() req: any,
    ) {
        return this.productsService.getLowStockProducts(
            req.user.businessId,
        );
    }

    @Get("auto-purchases")
    @Roles("OWNER")
    async autoPurchases(@Request() req: any) {
        return this.productsService.generateAutoPurchases(
            req.user.businessId,
        );
    }

    @Get("purchase-recommendations")
    @Roles("OWNER")
    getPurchaseRecommendations(
        @Request() req: any,
    ) {
        return this.productsService
            .getPurchaseRecommendations(
                req.user.businessId,
            );
    }

    // ======================
    // FIND BY BARCODE
    // ======================
    @Get("barcode/:code")
    findByBarcode(
        @Param("code") code: string,
        @Request() req: any,
    ) {
        return this.productsService.findByBarcode(
            code,
            req.user.businessId,
        );
    }

    // ======================
    // GET ONE PRODUCT
    // ======================
    @Get(":id")
    findOne(
        @Param("id") id: string,
        @Request() req: any,
    ) {
        return this.productsService.findOne(
            id,
            req.user.businessId,
        );
    }



    // ======================
    // UPDATE PRODUCT
    // ======================
    @Patch(":id")
    @Roles("OWNER")
    update(
        @Param("id") id: string,
        @Body() data: any,
        @Request() req: any,
    ) {
        return this.productsService.update(
            id,
            data,
            req.user.businessId,
        );
    }


    // ======================
    // UPDATE STOCK
    // ======================
    @Patch(":id/stock")
    @Roles("OWNER")
    updateStock(
        @Param("id") id: string,

        @Body() body: any,

        @Request() req: any,
    ) {
        return this.productsService.updateStock(
            id,
            body.quantity,
            req.user.businessId,
            body.note,
        );
    }

    // ======================
    // TOGGLE ACTIVE
    // ======================
    @Patch(":id/toggle")
    @Roles("OWNER")
    toggle(
        @Param("id") id: string,
        @Request() req: any,
    ) {
        return this.productsService.toggleActive(
            id,
            req.user.businessId,
        );
    }

    // ======================
    // GET AVAILABLE SERIALS BY PRODUCT
    // ======================
    @Get(":id/serials")
    getAvailableSerialsByProduct(
        @Param("id") productId: string,
        @Request() req: any,
    ) {
        return this.productsService.getAvailableSerialsByProduct(
            productId,
            req.user.businessId,
        );
    }

    // ======================
    // SCAN SINGLE IMEI/SERIAL DIRECTLY
    // ======================
    @Get("serials/:serial/available")
    getSingleAvailableSerial(
        @Param("serial") serial: string,
        @Request() req: any,
    ) {
        return this.productsService.getSingleAvailableSerial(
            serial,
            req.user.businessId,
        );
    }
}

