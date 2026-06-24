import { Controller, Get, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/jwt.guard";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {

    constructor(
        private dashboardService: DashboardService
    ) { }

    @Get("summary")
    getDashboard() {
        return this.dashboardService.getDashboard();
    }

}