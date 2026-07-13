import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsNumber,
    Length,
    Min,
} from "class-validator";

import { Type } from "class-transformer";
import { DeviceType } from "@prisma/client";

export class CreateServiceOrderDto {
    //==========================================
    // RELACIONES
    //==========================================

    @IsString()
    customerId!: string;

    @IsOptional()
    @IsString()
    technicianId?: string;

    //==========================================
    // INFORMACIÓN DEL EQUIPO
    //==========================================

    @IsOptional()
    @IsEnum(DeviceType)
    deviceType?: DeviceType;

    @IsString()
    @Length(1, 100)
    deviceBrand!: string;

    @IsString()
    @Length(1, 100)
    deviceModel!: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    serialOrImei?: string;

    @IsOptional()
    @IsString()
    @Length(1, 50)
    color?: string;

    @IsOptional()
    @IsString()
    @Length(1, 100)
    password?: string;

    @IsOptional()
    accessories?: any;

    @IsOptional()
    @IsString()
    cosmeticCondition?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsNumber()
    batteryLevel?: number;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    hasSim?: boolean;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    hasMemoryCard?: boolean;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    deviceTurnsOn?: boolean;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    hasWaterDamage?: boolean;

    //==========================================
    // RECEPCIÓN
    //==========================================

    @IsString()
    @Length(5, 1000)
    problem!: string;

    @IsOptional()
    @IsString()
    observations?: string;

    @IsOptional()
    @IsDateString()
    estimatedDelivery?: string;
}