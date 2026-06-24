import { IsEnum, IsString, IsNotEmpty } from "class-validator";
import { ServiceStatus } from "@prisma/client";

export class ChangeStatusDto {
    @IsEnum(ServiceStatus, { message: "Estatus no válido" })
    status!: ServiceStatus; // El '!' le dice a TS que NestJS se encarga de asignarlo

    @IsString()
    @IsNotEmpty({ message: "La nota es obligatoria" })
    note!: string;
}