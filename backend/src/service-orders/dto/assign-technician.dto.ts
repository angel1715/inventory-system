import { IsString, IsUUID } from "class-validator";

export class AssignTechnicianDto {
@IsString()
technicianId!: string;
}
