import { IsString, IsOptional, IsNumber, Min } from "class-validator";

export class CreateCustomerDto {
    @IsString({ message: "El nombre es obligatorio" })
    name!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    taxId?: string; // Cédula o RNC

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxCredit?: number; // Límite de "fiao"
}

export class RecordPaymentDto {
    @IsNumber()
    @Min(1, { message: "El monto a abonar debe ser mayor a 0" })
    amount!: number;

    @IsOptional()
    @IsString()
    note?: string;
}