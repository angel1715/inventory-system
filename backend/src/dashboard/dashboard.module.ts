import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  providers: [DashboardService],
  controllers: [DashboardController],
  imports: [PrismaModule, SalesModule, SubscriptionModule]
})
export class DashboardModule { }
