import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
    Request,
} from "@nestjs/common";

import { ExpensesService }
    from "./expenses.service";

import { JwtAuthGuard }
    from "../auth/jwt.guard";

import { CreateExpenseDto }
    from "./dto/create-expense.dto";

@UseGuards(JwtAuthGuard)
@Controller("expenses")
export class ExpensesController {
    constructor(
        private readonly expensesService: ExpensesService,
    ) { }

    // ======================
    // CREATE EXPENSE
    // ======================
    @Post()
    create(
        @Body() dto: CreateExpenseDto,

        @Request() req: any,
    ) {

        return this.expensesService.create(
            dto,
            req.user.businessId,
        );
    }

    // ======================
    // GET ALL EXPENSES
    // ======================
    @Get()
    findAll(
        @Request() req: any,
    ) {

        return this.expensesService.findAll(
            req.user.businessId,
        );
    }

    // ======================
    // DELETE EXPENSE
    // ======================
    @Delete(":id")
    remove(
        @Param("id") id: string,

        @Request() req: any,
    ) {

        return this.expensesService.remove(
            id,
            req.user.businessId,
        );
    }
}

