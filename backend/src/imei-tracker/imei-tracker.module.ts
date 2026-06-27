import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ImeiTrackerController } from './imei-tracker.controller';
import { ImeiTrackerService } from './imei-tracker.service';
import { PrismaModule } from '../prisma/prisma.module'; // Importante para la BD

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [ImeiTrackerController],
  providers: [ImeiTrackerService],
})
export class ImeiTrackerModule { }