import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
    Min,
} from "class-validator";
import { Type } from "class-transformer";

class BatchDto {
    @IsString()
    @IsNotEmpty()
    batchNumber!: string;

    @IsString()
    @IsNotEmpty()
    expiryDate!: string; // Recibimos string ISO desde el cliente
}

class PurchaseItemDto {
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @Min(0.01)
    costPrice!: number;

    // 🔥 NUEVOS CAMPOS ADAPTABLES
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    serials?: string[];

    @IsOptional()
    @ValidateNested()
    @Type(() => BatchDto)
    batch?: BatchDto;
}

export class CreatePurchaseDto {
    @IsString()
    @IsNotEmpty()
    supplierId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PurchaseItemDto)
    items!: PurchaseItemDto[];
}