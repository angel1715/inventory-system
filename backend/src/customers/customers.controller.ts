import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, Put, Patch } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, RecordPaymentDto } from "./dto/customer.dto";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("customers")
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    // El empleado puede registrar clientes (queda sin crédito, ver el service)
    @Post()
    async create(@Body() dto: CreateCustomerDto, @Req() req: any) {
        const { businessId, role } = req.user;
        return this.customersService.create(dto, businessId, role);
    }

    @Get()
    async findAll(@Req() req: any) {
        const { businessId } = req.user;
        return this.customersService.findAll(businessId);

    }

        // Historial de recibos de pago: todos los roles (el cajero reimprime)
    @Get("payments")
    listPayments(@Req() req: any, @Query("customerId") customerId?: string) {
        return this.customersService.listPaymentReceipts(req.user.businessId, customerId);
    }
    
    @Get("payments/:receiptId")
    getPayment(@Param("receiptId") receiptId: string, @Req() req: any) {
        return this.customersService.getPaymentReceipt(receiptId, req.user.businessId);
    }

    @Get(":id/account-status")
    async getAccountStatus(@Param("id") customerId: string, @Req() req: any) {
        const { businessId } = req.user;
        return this.customersService.getAccountStatus(customerId, businessId);
    }

    // El empleado cobra en caja: registrar abonos es para todos los roles
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

    // Editar clientes (incluye el límite de crédito) y habilitarlos: solo dueño
    @Roles("OWNER")
    @Put(':id')
    update(@Param('id') id: string, @Body() dto: any, @Req() req) {
        return this.customersService.update(id, dto, req.user.businessId);
    }

    @Roles("OWNER")
    @Patch(':id/toggle')
    toggleActive(@Param('id') id: string, @Req() req) {
        return this.customersService.toggleActive(id, req.user.businessId);
    }
}