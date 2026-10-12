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
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UpdateSettingsDto } from "./dto/create-settings.dto";
import { UpdateNcfSequenceDto } from "./dto/update-ncf-sequence.dto";
import { Prisma } from "@prisma/client";
import { SubscriptionGuard } from "../subscription/subscription.guard";

@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) { }

  // =========================
  // CONFIGURACIÓN EMPRESA
  // =========================

  // Lectura para todos los roles: el POS y el ticket la necesitan.
  // El empleado la recibe sin las credenciales del conector e-CF.
  @Get()
  getSettings(@Request() req: any) {
    return this.settingsService.getSettings(req.user.businessId, req.user.role);
  }

  @Roles("OWNER")
  @Patch()
  update(@Request() req: any, @Body() body: UpdateSettingsDto) {
    return this.settingsService.updateSettings(req.user.businessId, body);
  }

  // =========================
  // SECUENCIAS NCF
  // =========================

  // Lectura para todos los roles (el POS elige el tipo de comprobante)
  @Get("sequences")
  getSequences(@Request() req: any) {
    return this.settingsService.getSequences(req.user.businessId);
  }

  @Roles("OWNER")
  @Post("sequences")
  createSequence(@Request() req: any, @Body() body: Prisma.NcfSequenceUncheckedCreateInput) {
    return this.settingsService.createSequence(req.user.businessId, body);
  }

  @Roles("OWNER")
  @Patch("sequences/:id")
  updateSequence(@Request() req: any, @Param("id") id: string, @Body() body: UpdateNcfSequenceDto) {
    return this.settingsService.updateSequence(id, req.user.businessId, body);
  }

  @Roles("OWNER")
  @Patch("sequences/:id/activate")
  activateSequence(@Request() req: any, @Param("id") id: string) {
    return this.settingsService.activateSequence(id, req.user.businessId);
  }

  @Roles("OWNER")
  @Delete("sequences/:id")
  deleteSequence(@Request() req: any, @Param("id") id: string) {
    return this.settingsService.deleteSequence(id, req.user.businessId);
  }
}