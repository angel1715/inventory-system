import { Controller, Post, Get, Body, Param, UseGuards, Req, Put, Patch } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, RecordPaymentDto } from "./dto/customer.dto";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";
// Asumiendo que usas los nombres estándar de tus JwtGuards

@Controller("customers")
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    async create(@Body() dto: CreateCustomerDto, @Req() req: any) {
        const { businessId } = req.user;
        return this.customersService.create(dto, businessId);
    }

    @Get()
    async findAll(@Req() req: any) {
        const { businessId } = req.user;
        return this.customersService.findAll(businessId);
    }

    @Get(":id/account-status")
    async getAccountStatus(@Param("id") customerId: string, @Req() req: any) {
        const { businessId } = req.user;
        return this.customersService.getAccountStatus(customerId, businessId);
    }

    // En tu customers.controller.ts

    @Post(':id/payment')
    async recordPayment(
        @Param('id') customerId: string,
        @Body() dto: RecordPaymentDto,
        @Req() req: any
    ) {

        const businessId = req.user.businessId;
        const userId = req.user.id;

        return this.customersService.recordPayment(customerId, dto, businessId, userId);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: any, @Req() req) {
        return this.customersService.update(id, dto, req.user.businessId);
    }

    @Patch(':id/toggle')
    toggleActive(@Param('id') id: string, @Req() req) {
        return this.customersService.toggleActive(id, req.user.businessId);
    }
}

