import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [SalesService],
  controllers: [SalesController],
  imports: [PrismaModule, SubscriptionModule]
})
export class SalesModule { }
