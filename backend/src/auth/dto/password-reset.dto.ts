import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class ForgotPasswordDto {
    @IsEmail()
    email!: string;
}

export class ResetPasswordDto {
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    token!: string;

    // Ajusta el mínimo al de tu RegisterDto para que las dos pantallas pidan lo mismo
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password!: string;
}