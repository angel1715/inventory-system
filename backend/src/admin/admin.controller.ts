import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { SubscriptionService } from '../subscription/subscription.service';
import { RolesGuard } from '../auth/roles.guard';     // Verifica el rol
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // Protege todo el controlador
export class AdminController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Roles('ADMIN') // Aunque tu guard es inteligente, es buena práctica dejarlo explícito
    @Post('approve-payment/:businessId/:paymentLogId')
    async approvePayment(
        @Param('businessId') businessId: string,
        @Param('paymentLogId') paymentLogId: string
    ) {
        return await this.subscriptionService.approveManualPayment(businessId, paymentLogId);
    }
}