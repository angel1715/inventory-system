import {
IsInt,
    IsString,
IsUUID,
Min,
} from "class-validator";

export class AddServiceItemDto {
@IsString()
productId!: string;

@IsInt()
@Min(1)
quantity!: number;
}
