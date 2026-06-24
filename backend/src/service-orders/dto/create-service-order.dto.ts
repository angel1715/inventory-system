import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Length,
} from "class-validator";

export class CreateServiceOrderDto {
    @IsNotEmpty()
    @IsString()
    customerId!: string;

    @IsOptional()
    @IsString()
    technicianId?: string;

    @IsString()
    @Length(1, 100)
    deviceBrand!: string;

    @IsString()
    @Length(1, 100)
    deviceModel!: string;

    @IsOptional()
    @IsString()
    serialOrImei?: string;

    @IsString()
    @Length(5, 1000)
    problem!: string;
}
