import { Controller, Post, Body, UseGuards, Request, Param, Get, Patch } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { ApprovePaymentDto, ToggleStatusDto, UpdatePlanDto } from './dto/admin-subscription.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

// Todas las rutas exigen sesión. A propósito NO lleva SubscriptionGuard: un negocio con la
// suscripción vencida tiene que poder subir su comprobante de pago.
// RolesGuard deja pasar siempre al ADMIN (el operador de la plataforma).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    // El dueño del negocio sube su comprobante de pago
    @Roles('OWNER')
    @Post('upload-receipt')
    async uploadReceipt(@Request() req, @Body() dto: UploadReceiptDto) {
        const businessId = req.user.businessId;
        return await this.subscriptionService.createManualPaymentLog(businessId, dto);
    }

    // ---------- Solo ADMIN ----------

    @Roles('ADMIN')
    @Get('all-subscriptions')
    async getAllSubscriptions() {
        return await this.subscriptionService.getAllSubscriptions();
    }

    @Roles('ADMIN')
    @Post('manual-reactivate/:businessId')
    async manualReactivate(@Param('businessId') businessId: string) {
        return await this.subscriptionService.reactivateSubscription(businessId);
    }

    @Roles('ADMIN')
    @Get('pending-payments')
    async getPendingPayments() {
        return await this.subscriptionService.getPendingPayments();
    }

    @Roles('ADMIN')
    @Post('approve/:businessId/:paymentLogId')
    async approve(
        @Param('businessId') businessId: string,
        @Param('paymentLogId') paymentLogId: string,
        @Body() dto: ApprovePaymentDto,
    ) {
        return await this.subscriptionService.approveManualPayment(businessId, paymentLogId, dto.planType);
    }

    // Endpoint del switch de activar / cancelar
    @Roles('ADMIN')
    @Post('toggle-status/:businessId')
    async toggleStatus(
        @Param('businessId') businessId: string,
        @Body() dto: ToggleStatusDto,
    ) {
        return await this.subscriptionService.toggleSubscriptionStatus(businessId, dto.status);
    }

    @Roles('ADMIN')
    @Patch('update-plan/:businessId')
    async updatePlan(
        @Param('businessId') businessId: string,
        @Body() dto: UpdatePlanDto,
    ) {
        return await this.subscriptionService.updatePlan(businessId, dto);
    }
}