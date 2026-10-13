import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
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

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(trim)
    name!: string;

    @IsEmail()
    @MaxLength(254)
    @Transform(trimLower)
    email!: string;

    // Máximo 72: bcrypt ignora lo que pase de ahí. Ajusta el mínimo al de tu pantalla de registro.
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password!: string;

    @IsEnum(Role)
    role!: Role;
}