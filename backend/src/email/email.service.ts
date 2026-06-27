import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // smtp-relay.brevo.com
        port: Number(process.env.SMTP_PORT), // 587
        auth: {
            user: process.env.SMTP_USER, // Tu identificador de Brevo
            pass: process.env.SMTP_PASS, // La clave SMTP que generaste
        },
    });

    // Definimos el correo que Brevo tiene autorizado (tu email real)
    private readonly SENDER_EMAIL = 'angelgarci310@gmail.com';

    async sendResetPasswordEmail(email: string, token: string) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;

        try {
            await this.transporter.sendMail({
                from: `"Tu Sistema de Inventario" <${this.SENDER_EMAIL}>`,
                to: email,
                subject: 'Recuperación de contraseña',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                        <h1>¿Has olvidado tu contraseña?</h1>
                        <p>Haz clic en el siguiente enlace para restablecerla. El enlace caducará en 15 minutos:</p>
                        <a href="${resetUrl}" style="background: #6366F1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer mi contraseña</a>
                    </div>
                `
            });
            this.logger.log(`Correo de recuperación enviado a: ${email}`);
        } catch (error: any) {
            this.logger.error(`Error enviando correo de recuperación: ${error.message}`);
            throw error;
        }
    }

    async sendSubscriptionReminder(email: string, businessName: string, expiryDate: Date) {
        const formattedDate = expiryDate.toLocaleDateString('es-DO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        try {
            await this.transporter.sendMail({
                from: `"Tu Sistema de Inventario" <${this.SENDER_EMAIL}>`,
                to: email,
                subject: 'Recordatorio: Tu suscripción vence pronto',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #333;">Hola ${businessName},</h2>
                        <p>Tu suscripción vence el día <strong>${formattedDate}</strong>.</p>
                        <p>Por favor, realiza tu transferencia para evitar interrupciones.</p>
                    </div>
                `
            });
            this.logger.log(`Recordatorio enviado a: ${email}`);
        } catch (error: any) {
            this.logger.error(`Error enviando recordatorio: ${error.message}`);
            throw error;
        }
    }
}