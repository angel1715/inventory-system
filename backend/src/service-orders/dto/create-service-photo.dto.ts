import { IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { ServicePhotoType } from "@prisma/client";

export class CreateServicePhotoDto {
    @IsUrl()
    imageUrl!: string;

    @IsEnum(ServicePhotoType)
    type!: ServicePhotoType;

    @IsOptional()
    @IsString()
    description?: string;
}