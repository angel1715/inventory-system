import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false, // true para puerto 465, false para otros
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    async sendResetPasswordEmail(email: string, token: string) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;

        await this.transporter.sendMail({
            from: `"Soporte Sistema" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Recuperación de contraseña',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h1>¿Has olvidado tu contraseña?</h1>
          <p>Haz clic en el siguiente enlace para restablecerla. El enlace caducará en 15 minutos:</p>
          <a href="${resetUrl}" style="background: #6366F1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer mi contraseña</a>
          <p>Si no fuiste tú quien solicitó este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
      `
        });
    }
}