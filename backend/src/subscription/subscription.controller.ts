import { Controller, Post, Body, UseGuards, Request, Param, Get, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @UseGuards(JwtAuthGuard)
    @Post('upload-receipt')
    @UseInterceptors(FileInterceptor('file'))
    async uploadReceipt(
        @Request() req,
        @Body() dto: any, // Aquí recibiremos el monto y la referencia
        @UploadedFile() file: Express.Multer.File // Aquí recibimos el archivo
    ) {
        if (!file) throw new BadRequestException('El comprobante es obligatorio');

        // Aquí, en lugar de pasar solo el DTO, pasas el archivo o su ruta
        // Para simplificar, puedes pasar el nombre del archivo o guardarlo en S3/servidor
        const businessId = req.user.businessId;

        // Asumiendo que guardas el archivo en tu servidor o procesas el nombre
        return await this.subscriptionService.createManualPaymentLog(businessId, {
            ...dto,
            receiptUrl: file.originalname // O la ruta donde lo guardes
        });
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

    @Post('approve/:businessId/:paymentLogId')
    @Roles('ADMIN')
    async approvePayment(
        @Param('businessId') businessId: string,
        @Param('paymentLogId') paymentLogId: string
    ) {
        return await this.subscriptionService.approveManualPayment(businessId, paymentLogId);
    }

    // ESTE ES EL ÚNICO ENDPOINT PARA EL SWITCH
    @Post('toggle-status/:businessId')
    @Roles('ADMIN')
    async toggleStatus(
        @Param('businessId') businessId: string,
        @Body('status') status: 'ACTIVE' | 'EXPIRED'
    ) {
        return await this.subscriptionService.toggleSubscriptionStatus(businessId, status);
    }
}