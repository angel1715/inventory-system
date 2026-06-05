import {
    IsString,
    IsNumber,
    IsOptional,
} from "class-validator";

export class CreateProductDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    sku?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsOptional()
    @IsString()
    supplierId?: string;

    @IsNumber()
    costPrice!: number;

    @IsNumber()
    salePrice!: number;

    @IsNumber()
    stock!: number;

    @IsNumber()
    minStock!: number;
}