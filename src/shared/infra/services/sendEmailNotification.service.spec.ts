import nodemailer from 'nodemailer';
import { SendMailServiceUseCase } from './sendEmailNotification.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

const createTransportMock = nodemailer.createTransport as jest.Mock;

describe('SendMailServiceUseCase', () => {
  const originalEnvironment = {
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    gmailUser: process.env.GMAIL_USER,
    gmailPassword: process.env.GMAIL_APP_PASSWORD,
  };
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_USER = 'mailer@example.test';
    process.env.SMTP_PASSWORD = 'mailbox-password';
    sendMailMock = jest.fn().mockResolvedValue({});
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
  });

  afterAll(() => {
    if (originalEnvironment.user === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = originalEnvironment.user;
    if (originalEnvironment.password === undefined) {
      delete process.env.SMTP_PASSWORD;
    } else {
      process.env.SMTP_PASSWORD = originalEnvironment.password;
    }
    if (originalEnvironment.gmailUser === undefined) {
      delete process.env.GMAIL_USER;
    } else {
      process.env.GMAIL_USER = originalEnvironment.gmailUser;
    }
    if (originalEnvironment.gmailPassword === undefined) {
      delete process.env.GMAIL_APP_PASSWORD;
    } else {
      process.env.GMAIL_APP_PASSWORD = originalEnvironment.gmailPassword;
    }
  });

  it('sends campaign mail to recipients through BCC', async () => {
    const service = new SendMailServiceUseCase();

    await expect(
      service.execute({
        bcc: ['first@example.test', 'second@example.test'],
        subject: 'Clinic update',
        text: 'Campaign body',
        html: '<p>Campaign body</p>',
      }),
    ).resolves.toBe(true);

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'mail.aquatecnica.ao',
      port: 465,
      secure: true,
      auth: { user: 'mailer@example.test', pass: 'mailbox-password' },
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'DentCare <mailer@example.test>',
        to: 'mailer@example.test',
        bcc: ['first@example.test', 'second@example.test'],
        subject: 'Clinic update',
        html: '<p>Campaign body</p>',
        text: 'Campaign body',
      }),
    );
  });

  it('returns an error response when SMTP delivery fails', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP unavailable'));
    const service = new SendMailServiceUseCase();

    await expect(
      service.execute({
        to: 'patient@example.test',
        subject: 'Clinic update',
        html: '<p>Campaign body</p>',
      }),
    ).resolves.toMatchObject({
      status: 500,
      data: { message: 'SMTP unavailable' },
    });
  });
});
