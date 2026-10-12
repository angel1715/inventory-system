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

import { ExpensesService } from "./expenses.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { SubscriptionGuard } from "../subscription/subscription.guard";

// Los gastos descuentan efectivo del arqueo de caja: solo el dueño los registra y los borra.
// Si tu amiga quiere que el empleado registre gastos chicos de caja, mueve @Roles("OWNER")
// de aquí a los métodos findAll y remove, y deja create abierto.
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles("OWNER")
@Controller("expenses")
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    create(@Body() dto: CreateExpenseDto, @Request() req: any) {
        return this.expensesService.create(dto, req.user.businessId);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.expensesService.findAll(req.user.businessId);
    }

    @Delete(":id")
    remove(@Param("id") id: string, @Request() req: any) {
        return this.expensesService.remove(id, req.user.businessId);
    }
}