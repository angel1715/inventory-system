import {
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
    private readonly logger = new Logger(EmailService.name);

    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    private readonly SENDER_EMAIL = 'angelgarci310@gmail.com';
    private readonly ADMIN_EMAIL = 'angelgarci310@gmail.com';

    async onModuleInit() {
        this.logger.log('========== CONFIGURACIÓN SMTP ==========');

        this.logger.log(`HOST: ${process.env.SMTP_HOST}`);
        this.logger.log(`PORT: ${process.env.SMTP_PORT}`);
        this.logger.log(`USER: ${process.env.SMTP_USER}`);
        this.logger.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);

        try {
            await this.transporter.verify();
            this.logger.log('✅ SMTP conectado correctamente');
        } catch (error: any) {
            this.logger.error('❌ Error verificando SMTP');
            this.logger.error(error);
        }
    }

    async sendResetPasswordEmail(email: string, token: string) {
        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;

        try {
            const info = await this.transporter.sendMail({
                from: `"Sistema OG-Admin" <${this.SENDER_EMAIL}>`,
                to: email,
                subject: 'Recuperación de contraseña',
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
                    <h2>Recuperación de contraseña</h2>

                    <p>
                        Haz clic en el siguiente botón para restablecer tu contraseña.
                    </p>

                    <a href="${resetUrl}"
                        style="
                            display:inline-block;
                            background:#000;
                            color:#fff;
                            padding:12px 24px;
                            text-decoration:none;
                            border-radius:6px;
                        ">
                        Restablecer contraseña
                    </a>

                    <p style="margin-top:20px;">
                        Este enlace expirará en 15 minutos.
                    </p>
                </div>
                `,
            });

            this.logger.log('========== RESPUESTA SMTP ==========');
            this.logger.log(`Message ID: ${info.messageId}`);
            this.logger.log(`Response: ${info.response}`);
            this.logger.log(`Accepted: ${JSON.stringify(info.accepted)}`);
            this.logger.log(`Rejected: ${JSON.stringify(info.rejected)}`);
            this.logger.log(`Pending: ${JSON.stringify(info.pending)}`);
            this.logger.log(`Envelope: ${JSON.stringify(info.envelope)}`);
            this.logger.log('====================================');

        } catch (error: any) {

            this.logger.error('========== ERROR SMTP ==========');
            this.logger.error(error);

            if (error.response) {
                this.logger.error(`SMTP Response: ${error.response}`);
            }

            if (error.code) {
                this.logger.error(`Code: ${error.code}`);
            }

            if (error.command) {
                this.logger.error(`Command: ${error.command}`);
            }

            this.logger.error('================================');
        }
    }

    async sendAdminNotification(
        businessName: string,
        amount: number,
    ) {
        try {
            const info = await this.transporter.sendMail({
                from: `"Admin Bot" <${this.SENDER_EMAIL}>`,
                to: this.ADMIN_EMAIL,
                subject: '🔔 Nuevo comprobante de pago recibido',
                html: `
                    <div style="font-family:sans-serif;padding:20px;">
                        <h2>Nuevo Pago Pendiente</h2>

                        <p>
                            El negocio
                            <strong>${businessName}</strong>
                            ha subido un comprobante.
                        </p>

                        <p>
                            Monto:
                            <strong>RD$ ${amount.toLocaleString()}</strong>
                        </p>

                        <p>
                            Revisa el panel administrativo para aprobarlo.
                        </p>
                    </div>
                `,
            });

            this.logger.log(
                `Correo enviado al administrador. ${info.response}`,
            );

        } catch (error: any) {
            this.logger.error(error);
        }
    }

    async sendPaymentStatusUpdate(
        email: string,
        businessName: string,
        status: 'APPROVED' | 'REJECTED',
    ) {

        const isApproved = status === 'APPROVED';

        const subject = isApproved
            ? '✅ Pago Aprobado'
            : '❌ Problema con tu pago';

        const message = isApproved
            ? 'Tu comprobante fue aprobado correctamente.'
            : 'Tu comprobante fue rechazado. Ponte en contacto con soporte.';

        try {
            const info = await this.transporter.sendMail({
                from: `"Sistema OG-Admin" <${this.SENDER_EMAIL}>`,
                to: email,
                subject,
                html: `
                    <div style="font-family:sans-serif;padding:20px;">
                        <h2>Hola ${businessName}</h2>

                        <p>${message}</p>

                        <hr>

                        <small>
                            Gracias por utilizar OG-Admin.
                        </small>
                    </div>
                `,
            });

            this.logger.log(
                `Correo enviado correctamente. ${info.response}`,
            );

        } catch (error: any) {
            this.logger.error(error);
        }
    }
}