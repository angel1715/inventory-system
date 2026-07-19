import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EcfModule } from '../ecf/ecf.module';

@Module({
  providers: [SalesService],
  controllers: [SalesController],
  imports: [PrismaModule, SubscriptionModule, EcfModule],
  exports: [SalesService],
})
export class SalesModule { }
