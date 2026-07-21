import { IsOptional, IsInt, IsDateString, Min } from "class-validator";

export class UpdateNcfSequenceDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    current?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    endAt?: number;

    @IsOptional()
    @IsDateString()
    expiryDate?: string;
}
