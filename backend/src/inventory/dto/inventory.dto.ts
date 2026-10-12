import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class RestockDto {
    @IsInt()
    @Min(1)
    @Max(100000)
    quantity!: number;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    note?: string;
}

export class WriteOffDto {
    @IsInt()
    @Min(1)
    @Max(100000)
    quantity!: number;

    // Una baja sin motivo no sirve para auditar
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    reason!: string;
}