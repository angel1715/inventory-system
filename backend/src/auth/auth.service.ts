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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) { }

  async register(data: { name: string; email: string; password: string; }) {
    const email = data.email.trim().toLowerCase();
    const usersCount = await this.prisma.user.count();
    if (usersCount > 0) throw new ForbiddenException("Public registration is disabled");

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException("Email already in use");

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const baseSlug = data.name.trim().toLowerCase().replace(/\s+/g, "-");
    const slug = `${baseSlug}-${Date.now()}`;

    const business = await this.prisma.business.create({
      data: { name: `${data.name}'s Business`, slug },
    });

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: hashedPassword,
        role: "OWNER",
        active: true,
        businessId: business.id,
      },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id, email: user.email, role: user.role, businessId: business.id,
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, businessId: business.id },
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { business: { include: { subscription: true } } }
    });

    if (!user || !user.active) throw new UnauthorizedException("Credenciales inválidas");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException("Credenciales inválidas");

    const subscription = user.business?.subscription ??
      await this.prisma.subscription.findFirst({ where: { businessId: user.businessId! } });

    const token = await this.jwtService.signAsync({
      sub: user.id, email: user.email, role: user.role, businessId: user.businessId,
    });

    return {
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        businessId: user.businessId,
        subscriptionStatus: subscription?.status ?? "INACTIVE",
      },
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

    // CORREGIDO: El nombre del método coincide con tu EmailService
    await this.emailService.sendResetPasswordEmail(email, token);
    
    return { message: "Correo enviado" };
  }

  async resetPassword(token: string, password: string) {
    // 1. Buscar el token y verificar expiración
    const resetEntry = await this.prisma.passwordResetToken.findFirst({
      where: { 
        token,
        expiresAt: { gt: new Date() } // Solo tokens no expirados
      },
    });

    if (!resetEntry) {
      throw new NotFoundException("Token no válido o expirado");
    }

    // 2. Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Actualizar usuario
    await this.prisma.user.update({
      where: { id: resetEntry.userId },
      data: { password: hashedPassword },
    });

    // 4. Eliminar el token para que no se vuelva a usar
    await this.prisma.passwordResetToken.delete({
      where: { id: resetEntry.id },
    });

    return { message: "Contraseña actualizada exitosamente" };
  }
}