import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module'; // Importa esto
import { CashService } from "./cash.service";
import { CashController } from "./cash.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [SubscriptionModule], // <--- ESTO ES LO QUE FALTA
  controllers: [CashController],
  providers: [CashService, PrismaService],
})
export class CashModule { }