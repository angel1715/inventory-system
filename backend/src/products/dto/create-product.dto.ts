import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min, IsEnum } from "class-validator";

// Definimos el tipo para asegurar la consistencia
export enum ProductCategory {
    SPARE_PART = 'SPARE_PART',
    ACCESSORY = 'ACCESSORY',
    DEVICE = 'DEVICE',
    SERVICE = 'SERVICE',
    OTHER = 'OTHER'
}

export class CreateProductDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    barcode!: string;

    @IsOptional()
    @IsString()
    sku?: string;

    @IsNumber()
    @Min(0)
    costPrice!: number;

    @IsNumber()
    @Min(0)
    salePrice!: number;

    @IsNumber()
    @Min(0)
    stock!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minStock?: number;

    // --- NUEVO CAMPO: Categoría ---
    @IsOptional()
    @IsEnum(ProductCategory)
    category?: ProductCategory = ProductCategory.OTHER;
    // -----------------------------

    @IsOptional()
    @IsString()
    supplierId?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsBoolean()
    isSerialized?: boolean;

    @IsOptional()
    @IsBoolean()
    hasExpiry?: boolean;

    @IsOptional()
    @IsDateString()
    expiryDate?: string;

    @IsOptional()
    @IsString()
    lotNumber?: string;
}