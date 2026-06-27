import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ImeiTrackerService } from './imei-tracker.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';

@Controller('imei-tracker')
@UseGuards(JwtAuthGuard, SubscriptionGuard) // Quítalo temporalmente si quieres probar en Postman sin token
export class ImeiTrackerController {
    constructor(private readonly imeiTrackerService: ImeiTrackerService) { }

    @Get(':serial')
    async getDeviceHistory(@Param('serial') serial: string) {
        return this.imeiTrackerService.trackSerial(serial);
    }
}