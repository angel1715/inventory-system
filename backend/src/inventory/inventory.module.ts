import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [SubscriptionModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    PrismaService,
  ],
})
export class InventoryModule { }