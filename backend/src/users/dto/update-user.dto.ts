import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { Role } from "@prisma/client";

const trim = ({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value;

const trimLower = ({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value;

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @Transform(trim)
    name?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(254)
    @Transform(trimLower)
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password?: string;

    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}