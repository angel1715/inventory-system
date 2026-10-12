import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateStockDto {
    @IsInt()
    @Min(1)
    @Max(100000)
    quantity!: number;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    note?: string;
}