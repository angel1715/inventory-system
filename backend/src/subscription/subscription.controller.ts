import { Controller, Post, Body, UseGuards, Request, Param, Get, Patch } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }
    // AdminController.ts (o SubscriptionController, donde esté tu POST)
    @UseGuards(JwtAuthGuard)
    @Post('upload-receipt')
    async uploadReceipt(@Request() req, @Body() dto: UploadReceiptDto) {
        const businessId = req.user.businessId;
        // El servicio ya maneja la lógica, el guard y la notificación al admin
        return await this.subscriptionService.createManualPaymentLog(businessId, dto);
    }

    @Get('all-subscriptions')
    @Roles('ADMIN')
    async getAllSubscriptions() {
        return await this.subscriptionService.getAllSubscriptions();
    }

    @Post('manual-reactivate/:businessId')
    @Roles('ADMIN')
    async manualReactivate(@Param('businessId') businessId: string) {
        return await this.subscriptionService.reactivateSubscription(businessId);
    }

    @Get('pending-payments')
    @Roles('ADMIN')
    async getPendingPayments() {
        return await this.subscriptionService.getPendingPayments();
    }

    @Roles('ADMIN')
    @Post('approve/:businessId/:paymentLogId')
    async approve(
        @Param('businessId') businessId: string,
        @Param('paymentLogId') paymentLogId: string,
        @Body() body: { planType: 'SUBSCRIPTION' | 'LIFETIME' }
    ) {
        // El servicio ya maneja la transacción y la notificación al cliente
        return await this.subscriptionService.approveManualPayment(businessId, paymentLogId, body.planType);
    }

    // ESTE ES EL ENDPOINT PARA EL SWITCH
    @Post('toggle-status/:businessId')
    @Roles('ADMIN')
    async toggleStatus(
        @Param('businessId') businessId: string,
        @Body('status') status: 'ACTIVE' | 'CANCELED' // Unificado a CANCELED
    ) {
        return await this.subscriptionService.toggleSubscriptionStatus(businessId, status);
    }

    @Patch('update-plan/:businessId')
    @Roles('ADMIN')
    async updatePlan(
        @Param('businessId') businessId: string,
        @Body() body: {
            accessType: 'SUBSCRIPTION' | 'LIFETIME',
            subscriptionStatus: 'ACTIVE' | 'CANCELED' // Unificado a CANCELED
        }
    ) {
        return await this.subscriptionService.updatePlan(businessId, body);
    }
}