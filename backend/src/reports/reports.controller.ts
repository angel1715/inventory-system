import {
    Controller,
    Get,
    Request,
    UseGuards,
} from "@nestjs/common";

import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/jwt.guard";


@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
    constructor(
        private reportsService: ReportsService,
    ) { }

    @Get("overview")
    async overview(
        @Request() req: any,
    ) {
        return this.reportsService.getOverview(
            req.user.businessId,
        );
    }
}
