import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    SubscriptionModule
  ],

  providers: [
    ReportsService,
  ],

  controllers: [
    ReportsController,
  ],
})
export class ReportsModule { }
