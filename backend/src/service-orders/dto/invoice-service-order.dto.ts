import {
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export class InvoiceServiceOrderDto {

    @IsString()
    paymentMethod!: string;

    @IsNumber()
    @Min(0)
    received!: number;

    @IsNumber()
    @Min(0)
    change!: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    initialPayment?: number;

    @IsString()
    @IsOptional()
    ncfType?: string;
}