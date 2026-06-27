import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { UpdateSettingsDto } from "./dto/create-settings.dto";
import { Prisma } from "@prisma/client";
import { SubscriptionGuard } from "../subscription/subscription.guard";

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Roles("OWNER")
@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) { }

  // =========================
  // CONFIGURACIÓN EMPRESA
  // =========================
  @Get()
  getSettings(@Request() req: any) {
    return this.settingsService.getSettings(req.user.businessId);
  }

  @Patch()
  update(@Request() req: any, @Body() body: UpdateSettingsDto) {
    return this.settingsService.updateSettings(req.user.businessId, body);
  }

  // =========================
  // SECUENCIAS NCF
  // =========================
  @Get("sequences")
  getSequences(@Request() req: any) {
    return this.settingsService.getSequences(req.user.businessId);
  }

  @Post("sequences")
  createSequence(@Request() req: any, @Body() body: Prisma.NcfSequenceUncheckedCreateInput) {
    return this.settingsService.createSequence(req.user.businessId, body);
  }

  @Patch("sequences/:id/activate")
  activateSequence(@Request() req: any, @Param("id") id: string) {
    return this.settingsService.activateSequence(id, req.user.businessId);
  }

  @Delete("sequences/:id")
  deleteSequence(@Request() req: any, @Param("id") id: string) {
    return this.settingsService.deleteSequence(id, req.user.businessId);
  }
}