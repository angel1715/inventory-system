import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-reset.dto";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// La clave del @Throttle debe coincidir con el nombre del limitador en app.module.ts ("short").
// Con "default" el límite se ignoraba. Los límites son por IP: un taller comparte la misma IP
// entre todos sus empleados, por eso el login permite 10 intentos y no 3.
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Throttle({ short: { limit: 10, ttl: FIFTEEN_MINUTES } })
  @Post("register")
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @Throttle({ short: { limit: 10, ttl: FIFTEEN_MINUTES } })
  @Post("login")
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body.email, body.password);
  }

  @Throttle({ short: { limit: 30, ttl: FIFTEEN_MINUTES } })
  @Get("validate-invitation/:token")
  async validateInvitation(@Param("token") token: string) {
    return await this.authService.validateInvitationToken(token);
  }

  @Post("generate-invitation")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async generateInvitation(@Request() req: any) {
    return await this.authService.generateInvitation(req.user);
  }

  @Get("invitations")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async getInvitations(@Request() req: any) {
    return await this.authService.getInvitations(req.user);
  }

  @Throttle({ short: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.initiatePasswordReset(dto.email);
  }

  @Throttle({ short: { limit: 10, ttl: FIFTEEN_MINUTES } })
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto.token, dto.password);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return await this.authService.getUserProfile(userId);
  }
}