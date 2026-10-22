import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { AuthActionEmail } from '../../domain/auth.repository';
import { AuthEmailService } from '../../domain/auth-email.service';

@Injectable()
export class NodemailerAuthEmailService implements AuthEmailService {
  private readonly logger = new Logger(NodemailerAuthEmailService.name);
  private readonly user = process.env.GMAIL_USER?.trim();
  private readonly appPassword = process.env.GMAIL_APP_PASSWORD?.replace(
    /\s/g,
    '',
  );
  private readonly smtpTlsCa = process.env.SMTP_TLS_CA_CERT?.replace(
    /\\n/g,
    '\n',
  ).trim();

  private readonly frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ).replace(/\/$/, '');
  private readonly transporter: Transporter | null =
    this.user && this.appPassword
      ? nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: this.user, pass: this.appPassword },
          ...(this.smtpTlsCa ? { tls: { ca: this.smtpTlsCa } } : {}),
        })
      : null;

  assertConfigured() {
    if (!this.transporter || !this.user || !this.appPassword) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }
    if (!/^[a-zA-Z0-9]{16}$/.test(this.appPassword)) {
      throw new ServiceUnavailableException(
        'Email delivery requires a valid 16-character Gmail app password',
      );
    }
  }

  async sendActivationEmail(input: AuthActionEmail) {
    const link = this.createLink('/auth/activate', input.token);
    await this.send({
      to: input.email,
      subject: 'Ative a sua conta DentCare',
      text: `Olá ${input.displayName}, confirme o seu endereço de email para ativar a conta: ${link}`,
      html: `<p>Olá ${this.escapeHtml(input.displayName)},</p><p>Confirme o seu endereço de email para ativar a conta:</p><p><a href="${link}">Ativar conta</a></p><p>Este link expira em 24 horas e só pode ser utilizado uma vez.</p>`,
    });
  }

  async sendPasswordResetEmail(input: AuthActionEmail) {
    const link = this.createLink(
      '/auth/forgot-password/recover-password',
      input.token,
    );
    await this.send({
      to: input.email,
      subject: 'Recuperação da palavra-passe DentCare',
      text: `Olá ${input.displayName}, utilize este link para definir uma nova palavra-passe: ${link}`,
      html: `<p>Olá ${this.escapeHtml(input.displayName)},</p><p>Recebemos um pedido para redefinir a sua palavra-passe.</p><p><a href="${link}">Definir nova palavra-passe</a></p><p>Este link expira em 1 hora e só pode ser utilizado uma vez. Se não fez este pedido, ignore esta mensagem.</p>`,
    });
  }

  async sendCampaignEmail(recipients: string[], subject: string, body: string) {
    await this.send({
      to: this.user!,
      bcc: recipients,
      subject,
      text: body,
    });
  }

  private async send(message: {
    to: string;
    bcc?: string[];
    subject: string;
    text: string;
    html?: string;
  }) {
    this.assertConfigured();
    try {
      await this.transporter!.sendMail({
        from: `DentCare <${this.user}>`,
        ...message,
      });
    } catch (error) {
      const details = error as {
        code?: unknown;
        command?: unknown;
        responseCode?: unknown;
      };
      const code = typeof details.code === 'string' ? details.code : 'unknown';
      const command =
        typeof details.command === 'string' ? details.command : 'unknown';
      const responseCode =
        typeof details.responseCode === 'number'
          ? details.responseCode
          : 'none';
      const certificateError = [
        'SELF_SIGNED_CERT_IN_CHAIN',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'CERT_HAS_EXPIRED',
      ].includes(code);
      this.logger.error(
        certificateError
          ? `Email TLS verification failed (code=${code}); configure SMTP_TLS_CA_CERT with the trusted CA certificate. TLS verification remains enabled.`
          : `Email delivery failed (code=${code}, smtp=${responseCode}, command=${command})`,
      );
      throw new ServiceUnavailableException('Email could not be delivered');
    }
  }

  private createLink(path: string, token: string) {
    const link = new URL(path, this.frontendUrl);
    link.searchParams.set('token', token);
    return link.toString();
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });
  }
}
