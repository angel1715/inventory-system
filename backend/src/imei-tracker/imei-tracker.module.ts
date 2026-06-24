import { Module } from '@nestjs/common';
import { ImeiTrackerController } from './imei-tracker.controller';
import { ImeiTrackerService } from './imei-tracker.service';
import { PrismaModule } from '../prisma/prisma.module'; // Importante para la BD

@Module({
  imports: [PrismaModule],
  controllers: [ImeiTrackerController],
  providers: [ImeiTrackerService],
})
export class ImeiTrackerModule { }