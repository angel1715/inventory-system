import { Module } from '@nestjs/common';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from '../prisma/prisma.module';
@Module({
  imports: [
    PrismaModule,
    SubscriptionModule
  ],
  providers: [CustomersService],
  controllers: [CustomersController],

})
export class CustomersModule { }
