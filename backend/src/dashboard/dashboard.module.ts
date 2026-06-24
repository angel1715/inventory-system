import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  providers: [DashboardService],
  controllers: [DashboardController],
  imports:[PrismaModule, SalesModule]
})
export class DashboardModule {}
