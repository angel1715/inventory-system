import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { EmailService } from "../email/email.service";
import { RegisterDto } from "./dto/register.dto";

// Cuando el correo no existe se compara contra este hash, para que el login tarde
// lo mismo exista o no el usuario (evita descubrir correos midiendo el tiempo).
const DUMMY_HASH = bcrypt.hashSync("no-existe", 12);

// El token de recuperación se guarda con hash: si la base se filtra, no sirve para entrar.
const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) { }

  private hasActiveSubscription(subscription: any): boolean {
        if (!subscription) return false;

    // Una suscripción cancelada no da acceso, ni siquiera de por vida
    if (subscription.subscriptionStatus === "CANCELED") return false;

    return (
      subscription.accessType === "LIFETIME" ||
      (subscription.currentPeriodEnd > new Date() &&
        subscription.subscriptionStatus === "ACTIVE")
    );
  }

  async register(data: RegisterDto) {
    const email = data.email.trim().toLowerCase();

    // El hash es lento: se calcula fuera de la transacción
    const hashedPassword = await bcrypt.hash(data.password, 12);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Validar la invitación DENTRO de la transacción
        const invitation = await tx.invitation.findUnique({
          where: { token: data.token }
        });

        if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
          throw new ForbiddenException("Invitación no válida o expirada");
        }

        // Si la invitación se generó para un correo concreto, debe coincidir
        if (invitation.email && invitation.email.trim().toLowerCase() !== email) {
          throw new ForbiddenException("Esta invitación es para otro correo");
        }

        // 2. Verificar usuario existente
        const exists = await tx.user.findUnique({ where: { email } });
        if (exists) throw new BadRequestException("El correo ya está en uso");

        // 3. Consumir la invitación: solo una petición puede hacerlo
        const claimed = await tx.invitation.updateMany({
          where: { id: invitation.id, used: false },
          data: { used: true }
        });
        if (claimed.count === 0) {
          throw new ForbiddenException("Invitación no válida o expirada");
        }

        // 4. Crear el negocio
        const slug = `${data.businessName.trim().toLowerCase().replace(/\s+/g, "-")}-${crypto.randomBytes(4).toString('hex')}`;
        const business = await tx.business.create({
          data: {
            name: data.businessName.trim(),
            slug,
            email,
          },
        });

        // 5. Crear configuraciones base
        await tx.businessSettings.create({
          data: { businessId: business.id, businessName: data.businessName.trim() }
        });

        // 6. Crear el usuario
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

        // 7. Trial automático de 14 días
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

        // 8. Token JWT
        const jwtToken = await this.jwtService.signAsync({
          sub: user.id,
          email: user.email,
          role: user.role,
          businessId: business.id,
        }, { expiresIn: '12h' });

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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("El correo ya está en uso");
      }
      throw error;
    }
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

    // Se compara siempre, exista o no el usuario, para que el tiempo de respuesta no lo delate
    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !user.active || !valid) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const subscription =
      user.business?.subscription ??
      (user.businessId
        ? await this.prisma.subscription.findFirst({ where: { businessId: user.businessId } })
        : null);

    const isActive = this.hasActiveSubscription(subscription);

    const token = await this.jwtService.signAsync({
      sub: user.id, email: user.email, role: user.role, businessId: user.businessId,
    }, { expiresIn: '12h' });

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

    const subscription =
      user.business?.subscription ??
      (user.businessId
        ? await this.prisma.subscription.findFirst({ where: { businessId: user.businessId } })
        : null);

    const isActive = this.hasActiveSubscription(subscription);

    // Los identificadores de Stripe no tienen por qué llegar al navegador
    const safeSubscription = subscription
      ? (({ stripeCustomerId, stripeSubscriptionId, ...rest }) => rest)(subscription)
      : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      active: user.active,
      subscriptionStatus: isActive ? "ACTIVE" : "CANCELED",
      subscription: safeSubscription
    };
  }

  async initiatePasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    // La respuesta es la misma exista o no el correo: no se revela quién está registrado
    if (user && user.active) {
      const token = crypto.randomBytes(32).toString('hex');

      await this.prisma.$transaction([
        // Un solo enlace vigente por usuario, y limpieza de los vencidos
        this.prisma.passwordResetToken.deleteMany({
          where: { OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }] },
        }),
        this.prisma.passwordResetToken.create({
          data: {
            token: hashToken(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        }),
      ]);

      // Sin await: la respuesta no tarda más cuando el correo existe.
      // EmailService captura sus propios errores.
      void this.emailService.sendResetPasswordEmail(normalized, token);
    }

    return {
      message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    };
  }

  async resetPassword(token: string, password: string) {
    const resetEntry = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: hashToken(token),
        expiresAt: { gt: new Date() }
      },
    });

    if (!resetEntry) {
      throw new BadRequestException("El enlace no es válido o ya expiró. Solicita uno nuevo.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.$transaction(async (tx) => {
      // Si otra petición ya usó este enlace, deleteMany devuelve 0
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: resetEntry.id },
      });
      if (consumed.count === 0) {
        throw new BadRequestException("El enlace no es válido o ya expiró. Solicita uno nuevo.");
      }

      await tx.user.update({
        where: { id: resetEntry.userId },
        data: { password: hashedPassword },
      });

      await tx.passwordResetToken.deleteMany({ where: { userId: resetEntry.userId } });
    });

    return { message: "Contraseña actualizada exitosamente" };
  }
}