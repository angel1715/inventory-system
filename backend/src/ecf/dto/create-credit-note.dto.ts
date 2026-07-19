import { IsString, IsOptional, IsNumber, Min } from "class-validator";

export class CreateCreditNoteDto {
    @IsString()
    modificationCode!: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    baseAmount?: number;

    @IsOptional()
    @IsString()
    reason?: string;
}
