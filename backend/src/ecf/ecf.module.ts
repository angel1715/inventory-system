import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { EcfService } from "./ecf.service";
import { EcfConnectorService } from "./ecf-connector.service";
import { EcfController } from "./ecf.controller";

@Module({
    imports: [PrismaModule, SubscriptionModule],
    controllers: [EcfController],
    providers: [EcfService, EcfConnectorService],
    exports: [EcfService],
})
export class EcfModule { }
