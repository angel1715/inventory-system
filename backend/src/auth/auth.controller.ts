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
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("register")
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post("login")
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body.email, body.password);
  }

  @Get("validate-invitation/:token")
  async validateInvitation(@Param("token") token: string) {
    return await this.authService.validateInvitationToken(token);
  }

  @Post("generate-invitation")
  @UseGuards(AuthGuard("jwt"))
  async generateInvitation(@Request() req: any) {
    return await this.authService.generateInvitation(req.user);
  }

  @Get("invitations")
  @UseGuards(AuthGuard("jwt"))
  async getInvitations(@Request() req: any) {
    return await this.authService.getInvitations(req.user);
  }

  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body("email") email: string) {
    return await this.authService.initiatePasswordReset(email);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: any) {
    const { token, password } = body;
    return await this.authService.resetPassword(token, password);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return await this.authService.getUserProfile(userId);
  }
}