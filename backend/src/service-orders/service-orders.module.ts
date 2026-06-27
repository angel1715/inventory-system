import { Module } from "@nestjs/common";
import { SubscriptionModule } from '../subscription/subscription.module';
import { PrismaService } from "../prisma/prisma.service";

import { ServiceOrdersController } from "./service-orders.controller";
import { ServiceOrdersService } from "./service-orders.service";

@Module({
    imports: [SubscriptionModule],
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
