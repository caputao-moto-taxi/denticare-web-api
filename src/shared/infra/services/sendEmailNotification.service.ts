import nodemailer from 'nodemailer';
import { errorResponse } from '../../../shared/contracts/httpContracts';

type IEmailItems = {
  to?: string;
  bcc?: string[];
  subject: string;
  text?: string;
  html: string;
};

export class SendMailServiceUseCase {
  async execute({
    to,
    bcc,
    subject,
    html,
    text,
  }: IEmailItems): Promise<true | ReturnType<typeof errorResponse>> {
    try {
      const user = (process.env.SMTP_USER ?? process.env.GMAIL_USER)?.trim();
      const password = (
        process.env.SMTP_PASSWORD ?? process.env.GMAIL_APP_PASSWORD
      )?.trim();

      if (!user || !password) {
        throw new Error('Email delivery is not configured');
      }
      if (!to && !bcc?.length) {
        throw new Error('At least one email recipient is required');
      }

      const transporter = nodemailer.createTransport({
        host: 'mail.aquatecnica.ao',
        port: 465,
        secure: true,
        auth: {
          user,
          pass: password,
        },
      });

      await transporter.sendMail({
        from: `DentCare <${user}>`,
        to: to ?? user,
        bcc,
        subject,
        html,
        text,
      });
      return true;
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
