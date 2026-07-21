import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { EmailService } from "../email/email.service";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) { }

  async register(data: RegisterDto) {
    const email = data.email.trim().toLowerCase();

    return await this.prisma.$transaction(async (tx) => {
      // 1. Buscar y validar la invitación DENTRO de la transacción
      const invitation = await tx.invitation.findUnique({
        where: { token: data.token }
      });

      if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
        throw new ForbiddenException("Invitación no válida o expirada");
      }

      // 2. Verificar usuario existente
      const exists = await tx.user.findUnique({ where: { email } });
      if (exists) throw new BadRequestException("El correo ya está en uso");

      // 3. Marcar invitación como usada
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { used: true }
      });

      // 4. Crear el negocio
      const slug = `${data.businessName.trim().toLowerCase().replace(/\s+/g, "-")}-${crypto.randomBytes(4).toString('hex')}`;
      const business = await tx.business.create({
        data: {
          name: data.businessName.trim(),
          slug,
          email: data.email
        },
      });

      // 5. Crear configuraciones base
      await tx.businessSettings.create({
        data: { businessId: business.id, businessName: data.businessName.trim() }
      });

      // 6. Crear el usuario
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email,
          password: hashedPassword,
          role: "OWNER",
          active: true,
          businessId: business.id,
        },
      });

      // 7. Crear el Trial automáticamente de 14 días (Directo con tx)
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 14);

      await tx.subscription.create({
        data: {
          businessId: business.id,
          accessType: 'TRIAL',
          subscriptionStatus: 'ACTIVE',
          currentPeriodEnd: trialExpiry,
        }
      });

      // 8. Generar token JWT
      const jwtToken = await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
        businessId: business.id,
      });

      return {
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: business.id
        },
      };
    });
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        business: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user || !user.active) throw new UnauthorizedException("Credenciales inválidas");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException("Credenciales inválidas");

    const subscription = user.business?.subscription ??
      await this.prisma.subscription.findFirst({ where: { businessId: user.businessId! } });

    const now = new Date();
    const isActive = subscription && (
      subscription.accessType === 'LIFETIME' ||
      (subscription.currentPeriodEnd > now && subscription.subscriptionStatus === 'ACTIVE')
    );

    const token = await this.jwtService.signAsync({
      sub: user.id, email: user.email, role: user.role, businessId: user.businessId,
    });

    return {
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        businessId: user.businessId,
        subscriptionStatus: isActive ? "ACTIVE" : "CANCELED",
      },
    };
  }

  async validateInvitationToken(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitación inválida o expirada");
    }
    return { valid: true };
  }

  async generateInvitation(currentUser: any) {
    if (currentUser.role !== "ADMIN") {
      throw new ForbiddenException("No tienes permisos de administrador");
    }

    const token = crypto.randomBytes(16).toString('hex');
    return await this.prisma.invitation.create({
      data: {
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  }

  async getInvitations(currentUser: any) {
    if (currentUser.role !== "ADMIN") {
      throw new ForbiddenException("No tienes permisos de administrador");
    }

    return await this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUserProfile(userId: string) {
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

    const now = new Date();
    const isLifetime = subscription?.accessType === 'LIFETIME';
    const isWithinDate = subscription ? subscription.currentPeriodEnd > now : false;
    const isStatusActive = subscription?.subscriptionStatus === 'ACTIVE';

    const isActive = subscription && (isLifetime || (isWithinDate && isStatusActive));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      active: user.active,
      subscriptionStatus: isActive ? "ACTIVE" : "CANCELED",
      subscription: subscription
    };
  }

  async initiatePasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException("Usuario no encontrado");

    const token = crypto.randomBytes(32).toString('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        token: token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.emailService.sendResetPasswordEmail(email, token);

    return { message: "Correo enviado" };
  }

  async resetPassword(token: string, password: string) {
    const resetEntry = await this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }
      },
    });

    if (!resetEntry) {
      throw new NotFoundException("Token no válido o expirado");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: resetEntry.userId },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordResetToken.delete({
      where: { id: resetEntry.id },
    });

    return { message: "Contraseña actualizada exitosamente" };
  }
}