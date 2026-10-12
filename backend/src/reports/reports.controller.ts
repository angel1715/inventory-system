import {
    Controller,
    Get,
    Request,
    UseGuards,
} from "@nestjs/common";

import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SubscriptionGuard } from "../subscription/subscription.guard";

// Reportes: solo el dueño
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles("OWNER")
@Controller("reports")
export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    @Get("overview")
    async overview(@Request() req: any) {
        return this.reportsService.getOverview(req.user.businessId);
    }
}