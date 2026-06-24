import {
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
    IsUUID,
    Min,
    IsEnum,
} from "class-validator";

import { Type } from "class-transformer";
import { NcfType } from "@prisma/client";

class SaleItemDto {
    @IsString()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @Min(0)
    salePrice!: number;

    @IsString()
    @IsOptional()
    serialNumber?: string;
}

export class CreateSaleDto {
    @IsString()
    idempotencyKey!: string;

    @IsString()
    paymentMethod!: string;

    @IsNumber()
    received!: number;

    @IsNumber()
    change!: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    initialPayment?: number; // Agregado

    @IsNumber()
    @Min(0)
    @IsOptional()
    customTotal?: number;

    @IsString()
    @IsOptional()
    customerId?: string;

    @IsString()
    @IsOptional()
    ncfType?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SaleItemDto)
    items!: SaleItemDto[];
}