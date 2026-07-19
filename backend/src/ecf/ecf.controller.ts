import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { SubscriptionGuard } from "../subscription/subscription.guard";
import { Roles } from "../auth/roles.decorator";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { EcfService } from "./ecf.service";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller("ecf")
export class EcfController {
    constructor(private ecfService: EcfService) { }

    @Roles("OWNER")
    @Post("test-connection")
    testConnection(@GetUser("businessId") businessId: string) {
        return this.ecfService.testConnection(businessId);
    }

    @Roles("OWNER")
    @Get("taxes")
    getTaxes(@GetUser("businessId") businessId: string) {
        return this.ecfService.getTaxes(businessId);
    }

    @Post("sales/:id/send")
    sendSaleInvoice(@GetUser("businessId") businessId: string, @Param("id") saleId: string) {
        return this.ecfService.sendSaleInvoice(businessId, saleId);
    }

    @Post("sales/:id/refresh")
    refreshSaleStatus(
        @GetUser("businessId") businessId: string,
        @Param("id") saleId: string,
        @Query("live") live?: string,
    ) {
        return this.ecfService.refreshSaleStatus(businessId, saleId, live === "true");
    }

    @Post("sales/:id/credit-note")
    issueCreditNote(
        @GetUser("businessId") businessId: string,
        @GetUser("id") userId: string,
        @Param("id") saleId: string,
        @Body() dto: CreateCreditNoteDto,
    ) {
        return this.ecfService.issueCreditNote(businessId, saleId, dto, userId);
    }
}
