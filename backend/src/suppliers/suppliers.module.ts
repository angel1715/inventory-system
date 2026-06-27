import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { SuppliersController } from "./suppliers.controller";
import { SuppliersService } from "./suppliers.service";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, SubscriptionModule],

  controllers: [SuppliersController],

  providers: [SuppliersService],
})
export class SuppliersModule { }