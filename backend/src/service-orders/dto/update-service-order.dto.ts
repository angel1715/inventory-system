import { IsOptional, IsString, Length } from "class-validator";

export class UpdateServiceOrderDto {
    @IsOptional()
    @IsString()
    @Length(1, 100)
    deviceBrand?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    deviceModel?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    serialOrImei?: string;

    @IsOptional()
    @IsString()
    @Length(1, 500)
    problem?: string;
}