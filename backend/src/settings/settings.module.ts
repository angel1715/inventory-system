import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({

  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [PrismaModule, SubscriptionModule]
})
export class SettingsModule { }