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
  private readonly frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ).replace(/\/$/, '');
  private readonly transporter: Transporter | null =
    this.user && this.appPassword
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: { user: this.user, pass: this.appPassword },
        })
      : null;

  assertConfigured() {
    if (!this.transporter || !this.user) {
      throw new ServiceUnavailableException('Email delivery is not configured');
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

  async sendCampaignEmail(
    recipients: string[],
    subject: string,
    body: string,
  ) {
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
      this.logger.error(
        `Email delivery failed (code=${code}, smtp=${responseCode}, command=${command})`,
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
