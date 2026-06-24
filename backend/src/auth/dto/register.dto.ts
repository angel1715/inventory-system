import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class RegisterDto {
    @IsNotEmpty()
    token!: string; // Añadido aquí

    @IsNotEmpty()
    businessName!: string;

    @IsNotEmpty()
    name!: string;

    @IsEmail()
    email!: string;

    @MinLength(6)
    password!: string;
}