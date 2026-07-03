import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    private readonly SENDER_EMAIL = 'angelgarci310@gmail.com';
    private readonly ADMIN_EMAIL = 'angelgarci310@gmail.com'; // Tu correo como admin

    // --- Funciones existentes ---

    async sendResetPasswordEmail(email: string, token: string) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;
        try {
            await this.transporter.sendMail({
                from: `"Sistema OG-Admin" <${this.SENDER_EMAIL}>`,
                to: email,
                subject: 'Recuperación de contraseña',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                        <h1>¿Has olvidado tu contraseña?</h1>
                        <p>Haz clic para restablecerla (expira en 15 min):</p>
                        <a href="${resetUrl}" style="background: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer</a>
                    </div>
                `
            });
            this.logger.log(`Correo de recuperación enviado a: ${email}`);
        } catch (error: any) {
            this.logger.error(`Error enviando correo de recuperación: ${error.message}`);
        }
    }

    async sendSubscriptionReminder(email: string, businessName: string, expiryDate: Date) {
        const formattedDate = expiryDate.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
        try {
            await this.transporter.sendMail({
                from: `"Sistema OG-Admin" <${this.SENDER_EMAIL}>`,
                to: email,
                subject: 'Recordatorio: Tu suscripción vence pronto',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #333;">Hola ${businessName},</h2>
                        <p>Tu suscripción vence el <strong>${formattedDate}</strong>.</p>
                        <p>Por favor, realiza tu pago a tiempo para evitar interrupciones.</p>
                    </div>
                `
            });
        } catch (error: any) {
            this.logger.error(`Error enviando recordatorio: ${error.message}`);
        }
    }

    // --- NUEVAS FUNCIONES PARA PRODUCCIÓN ---

    /**
     * Notifica al admin que hay un comprobante pendiente
     */
    async sendAdminNotification(businessName: string, amount: number) {
        try {
            await this.transporter.sendMail({
                from: `"Admin Bot" <${this.SENDER_EMAIL}>`,
                to: this.ADMIN_EMAIL,
                subject: '🔔 Nuevo comprobante de pago recibido',
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Nuevo Pago Pendiente</h2>
                        <p>El negocio <strong>${businessName}</strong> ha subido un comprobante.</p>
                        <p>Monto: <strong>RD$ ${amount.toLocaleString()}</strong></p>
                        <p>Revisa el panel administrativo para aprobarlo.</p>
                    </div>
                `
            });
        } catch (error: any) {
            this.logger.error(`Error notificando al admin: ${error.message}`);
        }
    }

    /**
     * Notifica al cliente el resultado de su validación
     */
    async sendPaymentStatusUpdate(email: string, businessName: string, status: 'APPROVED' | 'REJECTED') {
        const isApproved = status === 'APPROVED';
        const subject = isApproved ? '✅ Pago Aprobado - Acceso Activado' : '❌ Problema con tu pago';
        const message = isApproved
            ? 'Tu comprobante ha sido validado correctamente. Tu acceso está activo.'
            : 'Tu comprobante no pudo ser verificado. Por favor, contacta con soporte.';

        try {
            await this.transporter.sendMail({
                from: `"Sistema OG-Admin" <${this.SENDER_EMAIL}>`,
                to: email,
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                        <h2>Hola ${businessName},</h2>
                        <p>${message}</p>
                        <hr/>
                        <p><small>Gracias por usar OG-Admin</small></p>
                    </div>
                `
            });
        } catch (error: any) {
            this.logger.error(`Error enviando estado de pago a ${email}: ${error.message}`);
        }
    }
}