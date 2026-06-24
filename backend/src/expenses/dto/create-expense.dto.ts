import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
} from "class-validator";

import { ExpenseCategory } from "@prisma/client";

export class CreateExpenseDto {

    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    amount!: number;

    @IsEnum(ExpenseCategory)
    category!: ExpenseCategory;
}