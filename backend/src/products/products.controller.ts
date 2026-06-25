import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Patch,
    Query,
    UseGuards,
    Request,
    Req,
} from "@nestjs/common";

import { ProductsService } from "./products.service";


import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";

@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
    ) { }

    // ======================
    // CREATE PRODUCT
    // ======================
    @Post()
    @Roles("OWNER", 'ADMIN')
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
    async autoPurchases(@Request() req: any) {
        return this.productsService.generateAutoPurchases(
            req.user.businessId,
        );
    }

    @Get("purchase-recommendations")
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

