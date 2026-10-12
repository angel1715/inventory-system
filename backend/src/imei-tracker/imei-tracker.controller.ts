import { BadRequestException, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ImeiTrackerService } from './imei-tracker.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';

// Todos los roles pueden consultar. El service oculta proveedor y costos a quien no sea dueño.
@Controller('imei-tracker')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ImeiTrackerController {
    constructor(private readonly imeiTrackerService: ImeiTrackerService) { }

    @Get(':serial')
    track(@Param('serial') serial: string, @Req() req: any) {
        const cleanSerial = serial?.trim();

        if (!cleanSerial || cleanSerial.length > 64) {
            throw new BadRequestException('El IMEI o número de serie no es válido.');
        }

        return this.imeiTrackerService.trackSerial(
            cleanSerial,
            req.user.businessId,
            req.user.role,
        );
    }
}