import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, SubscriptionModule],

  controllers: [ExpensesController],

  providers: [ExpensesService],
})
export class ExpensesModule { }