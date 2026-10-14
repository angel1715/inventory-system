import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class BatchDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    batchNumber!: string;

    // Fecha ISO (por ejemplo 2027-03-31); antes cualquier texto pasaba la validación
    @IsDateString()
    expiryDate!: string;
}

class PurchaseItemDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    productId!: string;

    // Un entero: no se compran 1.5 equipos
    @IsInt()
    @Min(1)
    @Max(100000)
    quantity!: number;

    @IsNumber({ maxDecimalPlaces: 4 })
    @Min(0.01)
    @Max(100000000)
    costPrice!: number;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(1000)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(64, { each: true })
    serials?: string[];

    @IsOptional()
    @ValidateNested()
    @Type(() => BatchDto)
    batch?: BatchDto;
}

export class CreatePurchaseDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    supplierId!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(200)
    @ValidateNested({ each: true })
    @Type(() => PurchaseItemDto)
    items!: PurchaseItemDto[];
}