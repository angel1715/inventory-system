import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  NotFoundException,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Param,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { PrismaService } from "../prisma/prisma.service";
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) { }

  // Método privado auxiliar para validación de administrador
  private validateAdmin(user: any) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("No tienes permisos de administrador");
    }
  }

  @Post("register")
  async register(@Body() body: RegisterDto) {
    // El servicio se encarga de validar el token, 
    // asegurar la transacción y retornar el resultado
    return await this.authService.register(body);
  }

  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post("login")
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get("validate-invitation/:token")
  async validateInvitation(@Param("token") token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() } // Que no haya expirado
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitación inválida o expirada");
    }
    return { valid: true };
  }

  @Post("generate-invitation")
  @UseGuards(AuthGuard("jwt"))
  async generateInvitation(@Request() req: any) {
    this.validateAdmin(req.user);

    const token = crypto.randomBytes(16).toString('hex');
    return await this.prisma.invitation.create({
      data: {
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  }

  @Get("invitations")
  @UseGuards(AuthGuard("jwt"))
  async getInvitations(@Request() req: any) {
    this.validateAdmin(req.user);

    return await this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' }
    });
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
    try {
      return await this.authService.resetPassword(token, password);
    } catch (error: any) {
      throw error;
    }
  }

  // En auth.controller.ts - Método me
  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: {
          include: { subscription: true }
        }
      }
    });

    if (!user) throw new NotFoundException("Usuario no encontrado");

    const subscription = user.business?.subscription
      ?? await this.prisma.subscription.findFirst({ where: { businessId: user.businessId! } });

    // Lógica dinámica para el estado
    const now = new Date();
    const isActive = subscription && (
      subscription.accessType === 'LIFETIME' ||
      (subscription.currentPeriodEnd > now)
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      active: user.active,
      subscriptionStatus: isActive ? "ACTIVE" : "INACTIVE", // Ajustado aquí
      subscription: subscription
    };
  }
}