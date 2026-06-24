import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class UpdateLaborCostDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(0, { message: 'El costo de mano de obra no puede ser negativo' })
    laborCost!: number;
}