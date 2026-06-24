import { IsNumber, Min } from "class-validator";

export class OpenRegisterDto {
    @IsNumber({}, { message: "El monto de apertura debe ser un número" })
    @Min(0, { message: "El monto de apertura no puede ser negativo" })
    openingAmount!: number; // 🔥 Añadido el "!" aquí
}

export class CloseRegisterDto {
    @IsNumber({}, { message: "El monto real en caja debe ser un número" })
    @Min(0, { message: "El monto real en caja no puede ser negativo" })
    actualCash!: number; // 🔥 Añadido el "!" aquí
}