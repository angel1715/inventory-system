import {
    IsNumber,
    IsPositive,
    IsString,
    Matches,
    Max,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadReceiptDto {
    // Número de confirmación del banco: sin espacios y en mayúsculas, para que
    // "abc123" y "ABC123 " cuenten como la misma referencia
    @IsString()
    @MinLength(4)
    @MaxLength(40)
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toUpperCase() : value,
    )
    referenceNumber!: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Max(10000000)
    amount!: number;

    // Solo imágenes subidas a Cloudinary (así las sube el sistema)
    @IsString()
    @MaxLength(500)
    @Matches(/^https:\/\/res\.cloudinary\.com\/\S+$/, {
        message: 'El comprobante debe ser una imagen subida desde el sistema',
    })
    receiptUrl!: string;
}