import { IsString, IsInt, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateNcfSequenceDto {
    @IsString()
    @IsNotEmpty()
    type: string = ''; // Inicializamos como vacío

    @IsInt()
    startAt: number = 0;

    @IsInt()
    endAt: number = 0;

    @IsDateString()
    expiryDate: Date = new Date();
}