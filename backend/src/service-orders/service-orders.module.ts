import { Module } from "@nestjs/common";
import { SubscriptionModule } from "../subscription/subscription.module";
import { PrismaService } from "../prisma/prisma.service";
import { ServiceOrdersController } from "./service-orders.controller";
import { ServiceOrdersService } from "./service-orders.service";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesModule } from "../sales/sales.module";
import { PublicTrackingController } from "./public-tracking.controller";
import { EmailModule } from "../email/email.module";

@Module({
    imports: [SubscriptionModule, PrismaModule, SalesModule, EmailModule],
    controllers: [ServiceOrdersController, PublicTrackingController],

    providers: [
        ServiceOrdersService,
        PrismaService,
    ],

    exports: [
        ServiceOrdersService,
    ],
})
export class ServiceOrdersModule { }