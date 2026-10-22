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
  private readonly user = (
    process.env.SMTP_USER ?? process.env.GMAIL_USER
  )?.trim();
  private readonly password = (
    process.env.SMTP_PASSWORD ?? process.env.GMAIL_APP_PASSWORD
  )?.trim();
  private readonly smtpTlsCa = process.env.SMTP_TLS_CA_CERT?.replace(
    /\\n/g,
    '\n',
  );

  private readonly frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ).replace(/\/$/, '');
  private readonly transporter: Transporter | null =
    this.user && this.password
      ? nodemailer.createTransport({
          host: 'mail.aquatecnica.ao',
          port: 465,
          secure: true,
          auth: { user: this.user, pass: this.password },
          ...(this.smtpTlsCa ? { tls: { ca: this.smtpTlsCa } } : {}),
        })
      : null;

  assertConfigured() {
    if (!this.transporter || !this.user || !this.password) {
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
        originalCode?: unknown;
        command?: unknown;
        responseCode?: unknown;
        syscall?: unknown;
        address?: unknown;
        port?: unknown;
      };
      const wrapperCode =
        typeof details.code === 'string' ? details.code : undefined;
      const code =
        typeof details.originalCode === 'string'
          ? details.originalCode
          : wrapperCode || 'unknown';
      const smtp =
        typeof details.responseCode === 'number'
          ? details.responseCode
          : 'none';
      const command =
        typeof details.command === 'string' ? details.command : 'unknown';
      const transport =
        wrapperCode && wrapperCode !== code ? `, transport=${wrapperCode}` : '';
      const networkDetails = [
        typeof details.syscall === 'string'
          ? `syscall=${details.syscall}`
          : undefined,
        typeof details.address === 'string'
          ? `address=${details.address}`
          : undefined,
        typeof details.port === 'number' ? `port=${details.port}` : undefined,
      ]
        .filter(Boolean)
        .join(', ');
      const guidance =
        code === 'ETIMEDOUT'
          ? '; verify SMTP host and outbound network access on port 465'
          : code === 'SELF_SIGNED_CERT_IN_CHAIN'
            ? '; configure SMTP_TLS_CA_CERT with the trusted CA certificate'
            : '';
      this.logger.error(
        `Email delivery failed (code=${code}${transport}, smtp=${smtp}, command=${command}${networkDetails ? `, ${networkDetails}` : ''})${guidance}`,
      );
      throw new ServiceUnavailableException('Email delivery failed');
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
