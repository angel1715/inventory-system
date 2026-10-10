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

    async sendSubscriptionReminder(
        email: string,
        businessName: string,
        expiryDate: Date
    ) {
        const formattedDate = expiryDate.toLocaleDateString('es-DO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        try {
            const response = await this.client.sendTransacEmail({
                sender: {
                    email: this.SENDER_EMAIL,
                    name: 'Sistema OG-Admin',
                },
                to: [{ email }],
                subject: '⏰ Recordatorio: tu suscripción vence pronto',
                htmlContent: `
                <div style="font-family:sans-serif;padding:20px;">
                    <h2>Hola ${businessName}</h2>

                    <p>
                        Tu suscripción vence el
                        <strong>${formattedDate}</strong>.
                    </p>

                    <p>
                        Por favor realiza el pago para evitar interrupciones.
                    </p>

                    <hr/>
                    <small>Sistema OG-Admin</small>
                </div>
            `,
            });

            this.logger.log('Subscription reminder enviado');
            this.logger.log(JSON.stringify(response));

        } catch (error: any) {
            this.logger.error('Error enviando reminder');
            this.logger.error(error?.response?.text || error.message);
        }
    }

        // =========================
    // REPARACIÓN LISTA PARA RETIRAR
    // =========================
    async sendRepairReadyEmail(params: {
        to: string;
        customerName: string;
        businessName: string;
        businessPhone?: string | null;
        businessAddress?: string | null;
        replyToEmail?: string | null;
        ticketNumber: string;
        device: string;
        trackingUrl: string;
    }): Promise<boolean> {
        const {
            to,
            customerName,
            businessName,
            businessPhone,
            businessAddress,
            replyToEmail,
            ticketNumber,
            device,
            trackingUrl,
        } = params;

        const e = (value: string) => this.escapeHtml(value);

        try {
            const response = await this.client.sendTransacEmail({
                // El remitente técnico es el verificado en Brevo; el nombre visible es el del taller.
                sender: { email: this.SENDER_EMAIL, name: businessName },
                // Si el cliente responde el correo, le llega al taller y no a la plataforma.
                ...(replyToEmail
                    ? { replyTo: { email: replyToEmail, name: businessName } }
                    : {}),
                to: [{ email: to, name: customerName }],
                subject: `✅ Tu equipo está listo para retirar - ${businessName}`,
                htmlContent: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#18181b;">
                        <h2 style="margin:0 0 4px;">${e(businessName)}</h2>
                        <p style="color:#71717a;margin:0 0 24px;font-size:13px;">
                            Orden de servicio #${e(ticketNumber)}
                        </p>

                        <h1 style="font-size:22px;margin:0 0 12px;">¡Tu equipo está listo!</h1>

                        <p>
                            Hola ${e(customerName)}, tu <strong>${e(device)}</strong>
                            ya está reparado y listo para retirar.
                        </p>

                        <p style="margin:28px 0;">
                            <a href="${trackingUrl}"
                                style="display:inline-block;padding:14px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                                Ver estado de mi reparación
                            </a>
                        </p>

                        ${
                            businessAddress
                                ? `<p style="margin:0 0 4px;"><strong>Dónde retirarlo:</strong> ${e(businessAddress)}</p>`
                                : ""
                        }
                        ${
                            businessPhone
                                ? `<p style="margin:0;"><strong>Teléfono:</strong> ${e(businessPhone)}</p>`
                                : ""
                        }

                        <hr style="margin:28px 0;border:none;border-top:1px solid #e4e4e7;" />
                        <small style="color:#a1a1aa;">
                            Este es un mensaje automático de ${e(businessName)}.
                        </small>
                    </div>
                `,
            });

            this.logger.log(`Email de reparación lista enviado (orden ${ticketNumber})`);
            this.logger.log(JSON.stringify(response));
            return true;
        } catch (error: any) {
            this.logger.error(`Error enviando email de reparación lista (orden ${ticketNumber})`);
            this.logger.error(error?.response?.text || error.message);
            return false;
        }
    }

    // Los datos del cliente y del equipo los escribe el personal: se escapan
    // antes de meterlos en el HTML del correo.
    private escapeHtml(value: string) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
}