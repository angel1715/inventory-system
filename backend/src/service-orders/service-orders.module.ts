import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { PrismaService } from "../prisma/prisma.service";

import { ServiceOrdersController } from "./service-orders.controller";
import { ServiceOrdersService } from "./service-orders.service";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesModule } from "../sales/sales.module";

@Module({
    imports: [SubscriptionModule, PrismaModule, SalesModule],
    controllers: [
        ServiceOrdersController,
    ],

    providers: [
        ServiceOrdersService,
        PrismaService,
    ],

    exports: [
        ServiceOrdersService,
    ],
})
export class ServiceOrdersModule { }
