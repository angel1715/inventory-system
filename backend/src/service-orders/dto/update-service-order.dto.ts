import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
} from "class-validator";

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

    @IsOptional()
    @IsString()
    diagnostic?: string;

    @IsOptional()
    @IsString()
    repairSolution?: string;

    @IsOptional()
    @IsString()
    estimatedRepairTime?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(365)
    warrantyDays?: number;

    @IsOptional()
    @IsBoolean()
    customerApproved?: boolean;
}