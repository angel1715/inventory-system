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
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { PrismaService } from "../prisma/prisma.service";
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) { }

  @Post("register")
  async register(@Body() body: RegisterDto) {
    // 1. Validar si el token es válido y no ha sido usado
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: body.token }
    });

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      throw new ForbiddenException("Invitación inválida o expirada");
    }

    // 2. Ejecutar la lógica de registro (Business + User)
    // ... tu lógica de registro actual ...

    // 3. Marcar la invitación como usada
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { used: true }
    });
    const result = await this.authService.register(body);

    return result;
  }

  @Throttle({ default: { limit: 3, ttl: 900000 } })
  @Post("login")
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  // =========================
  // NUEVOS ENDPOINTS INTEGRADOS
  // =========================

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
    console.log("Datos recibidos en backend:", { token, password }); // <-- AGREGA ESTO

    try {
      const result = await this.authService.resetPassword(token, password);
      console.log("Resultado del servicio:", result); // <-- AGREGA ESTO
      return result;
    } catch (error: any) {
      console.error("ERROR EN BACKEND:", error.message); // <-- AGREGA ESTO
      throw error;
    }
  }

  // =========================
  // ENDPOINT EXISTENTE
  // =========================

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

    // AQUÍ ESTÁ LA CORRECCIÓN:
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      active: user.active, // <-- AGREGAMOS ESTE CAMPO QUE VIENE DE LA BD
      subscriptionStatus: subscription?.status ?? "INACTIVE",
      subscription: subscription
    };
  }
}