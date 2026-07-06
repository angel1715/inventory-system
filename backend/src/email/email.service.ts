import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

@Injectable()
export class EmailService implements OnModuleInit {
    private readonly logger = new Logger(EmailService.name);

    private client: SibApiV3Sdk.TransactionalEmailsApi;

    private readonly SENDER_EMAIL = 'angelgarci310@gmail.com';
    private readonly ADMIN_EMAIL = 'angelgarci310@gmail.com';

    constructor() {
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        defaultClient.authentications['api-key'].apiKey =
            process.env.BREVO_API_KEY;

        this.client = new SibApiV3Sdk.TransactionalEmailsApi();
    }

    async onModuleInit() {
        this.logger.log('✅ Brevo API EmailService inicializado correctamente');
    }

    // =========================
    // RESET PASSWORD
    // =========================
    async sendResetPasswordEmail(email: string, token: string) {
        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;

        try {
            const response = await this.client.sendTransacEmail({
                sender: {
                    email: this.SENDER_EMAIL,
                    name: 'Sistema OG-Admin',
                },
                to: [{ email }],
                subject: 'Recuperación de contraseña',
                htmlContent: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
                        <h2>Recuperación de contraseña</h2>

                        <p>Haz clic en el botón para restablecer tu contraseña:</p>

                        <a href="${resetUrl}"
                            style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
                            Restablecer contraseña
                        </a>

                        <p style="margin-top:20px;font-size:12px;">
                            Este enlace expira en 15 minutos.
                        </p>
                    </div>
                `,
            });

            this.logger.log('===== BREVO API RESPONSE =====');
            this.logger.log(JSON.stringify(response, null, 2));

        } catch (error: any) {
            this.logger.error('❌ Error enviando email (Brevo API)');
            this.logger.error(error?.response?.text || error.message);
        }
    }

    // =========================
    // ADMIN NOTIFICATION
    // =========================
    async sendAdminNotification(businessName: string, amount: number) {
        try {
            const response = await this.client.sendTransacEmail({
                sender: {
                    email: this.SENDER_EMAIL,
                    name: 'Admin Bot',
                },
                to: [{ email: this.ADMIN_EMAIL }],
                subject: '🔔 Nuevo comprobante de pago recibido',
                htmlContent: `
                    <div style="font-family:sans-serif;padding:20px;">
                        <h2>Nuevo Pago Pendiente</h2>

                        <p>
                            El negocio <strong>${businessName}</strong>
                            ha subido un comprobante.
                        </p>

                        <p>
                            Monto: <strong>RD$ ${amount.toLocaleString()}</strong>
                        </p>
                    </div>
                `,
            });

            this.logger.log('Admin email enviado');
            this.logger.log(JSON.stringify(response));

        } catch (error: any) {
            this.logger.error(error?.response?.text || error.message);
        }
    }

    // =========================
    // PAYMENT STATUS
    // =========================
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
            : 'Tu comprobante fue rechazado. Contacta soporte.';

        try {
            const response = await this.client.sendTransacEmail({
                sender: {
                    email: this.SENDER_EMAIL,
                    name: 'Sistema OG-Admin',
                },
                to: [{ email }],
                subject,
                htmlContent: `
                    <div style="font-family:sans-serif;padding:20px;">
                        <h2>Hola ${businessName}</h2>
                        <p>${message}</p>
                        <hr/>
                        <small>Gracias por usar OG-Admin</small>
                    </div>
                `,
            });

            this.logger.log('Email de estado enviado');
            this.logger.log(JSON.stringify(response));

        } catch (error: any) {
            this.logger.error(error?.response?.text || error.message);
        }
    }
}