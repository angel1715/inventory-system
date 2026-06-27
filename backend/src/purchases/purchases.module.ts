import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { PurchasesService } from "./purchases.service";
import { PurchasesController } from "./purchases.controller";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, SubscriptionModule],

  controllers: [PurchasesController],

  providers: [PurchasesService],
})
export class PurchasesModule { }