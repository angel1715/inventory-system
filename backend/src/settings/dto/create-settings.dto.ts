import {
    IsOptional,
    IsString,
    IsNumber,
    Min,
    Max,
} from "class-validator";

export class UpdateSettingsDto {

    @IsString()
    businessName!: string;

    @IsOptional()
    @IsString()
    tradeName?: string;

    @IsOptional()
    @IsString()
    rnc?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    website?: string;

    @IsOptional()
    @IsString()
    instagram?: string;

    @IsOptional()
    @IsString()
    facebook?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    taxRate?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    invoiceFooter?: string;
}