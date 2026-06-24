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
      data: { name: data.businessName.trim(), slug },
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

    // 7. Generar token JWT
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