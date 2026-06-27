import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [ProductsService],
  imports: [PrismaModule, SubscriptionModule],
  controllers: [ProductsController]
})
export class ProductsModule { }
