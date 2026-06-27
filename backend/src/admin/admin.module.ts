import { Module } from "@nestjs/common";
import { SubscriptionModule } from "../subscription/subscription.module";
import { AdminController } from "./admin.controller";

@Module({
    imports: [SubscriptionModule],
    controllers: [AdminController],
})
export class AdminModule { }