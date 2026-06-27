import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class UploadReceiptDto {
    @IsNotEmpty()
    @IsString()
    referenceNumber!: string; // El número de confirmación del banco

    @IsNotEmpty()
    @IsNumber()
    amount!: number; // El monto que transfirieron

    @IsNotEmpty()
    @IsString()
    receiptUrl!: string; // La URL de la imagen que subiste a S3/Cloudinary
}