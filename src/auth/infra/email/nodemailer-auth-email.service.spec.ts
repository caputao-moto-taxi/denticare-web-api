import { Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { NodemailerAuthEmailService } from './nodemailer-auth-email.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

const createTransportMock = nodemailer.createTransport as jest.Mock;

describe('NodemailerAuthEmailService', () => {
  const originalEnvironment = {
    user: process.env.GMAIL_USER,
    appPassword: process.env.GMAIL_APP_PASSWORD,
    frontendUrl: process.env.FRONTEND_URL,
    smtpTlsCa: process.env.SMTP_TLS_CA_CERT,
  };
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_USER = 'mailer@example.test';
    process.env.GMAIL_APP_PASSWORD = 'abcdefghijklmnop';
    process.env.FRONTEND_URL = 'https://dentcare.example';
    delete process.env.SMTP_TLS_CA_CERT;
    sendMailMock = jest.fn().mockResolvedValue({});
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
  });

  afterAll(() => {
    if (originalEnvironment.user === undefined) {
      delete process.env.GMAIL_USER;
    } else {
      process.env.GMAIL_USER = originalEnvironment.user;
    }
    if (originalEnvironment.appPassword === undefined) {
      delete process.env.GMAIL_APP_PASSWORD;
    } else {
      process.env.GMAIL_APP_PASSWORD = originalEnvironment.appPassword;
    }
    if (originalEnvironment.frontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalEnvironment.frontendUrl;
    }
    if (originalEnvironment.smtpTlsCa === undefined) {
      delete process.env.SMTP_TLS_CA_CERT;
    } else {
      process.env.SMTP_TLS_CA_CERT = originalEnvironment.smtpTlsCa;
    }
  });

  it('sends an activation email with escaped content and an encoded token', async () => {
    const service = new NodemailerAuthEmailService();

    await service.sendActivationEmail({
      email: 'patient@example.test',
      displayName: '<Ana>',
      token: 'token&value',
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'mailer@example.test', pass: 'abcdefghijklmnop' },
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'DentCare <mailer@example.test>',
        to: 'patient@example.test',
        subject: 'Ative a sua conta DentCare',
        text: expect.stringContaining('token=token%26value'),
        html: expect.stringContaining('Olá &lt;Ana&gt;'),
      }),
    );
  });

  it('rejects a malformed Gmail app password before sending', async () => {
    process.env.GMAIL_APP_PASSWORD = 'invalid-password';
    const service = new NodemailerAuthEmailService();

    expect(() => service.assertConfigured()).toThrow(
      new ServiceUnavailableException(
        'Email delivery requires a valid 16-character Gmail app password',
      ),
    );
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('adds an explicitly configured trusted CA without disabling TLS checks', async () => {
    process.env.SMTP_TLS_CA_CERT =
      '-----BEGIN CERTIFICATE-----\\ntrusted-ca\\n-----END CERTIFICATE-----';
    const service = new NodemailerAuthEmailService();

    service.assertConfigured();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tls: {
          ca: '-----BEGIN CERTIFICATE-----\ntrusted-ca\n-----END CERTIFICATE-----',
        },
      }),
    );
  });

  it('converts SMTP authentication failures to a safe service error', async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    sendMailMock.mockRejectedValue(
      Object.assign(new Error('rejected'), { code: 'EAUTH' }),
    );
    const service = new NodemailerAuthEmailService();

    await expect(
      service.sendActivationEmail({
        email: 'patient@example.test',
        displayName: 'Ana',
        token: 'token',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(loggerError).toHaveBeenCalledWith(
      'Email delivery failed (code=EAUTH, smtp=none, command=unknown)',
    );
    loggerError.mockRestore();
  });

  it('logs actionable guidance for SMTP certificate verification failures', async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    sendMailMock.mockRejectedValue(
      Object.assign(new Error('certificate rejected'), {
        code: 'SELF_SIGNED_CERT_IN_CHAIN',
      }),
    );
    const service = new NodemailerAuthEmailService();

    await expect(
      service.sendActivationEmail({
        email: 'patient@example.test',
        displayName: 'Ana',
        token: 'token',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('configure SMTP_TLS_CA_CERT'),
    );
    loggerError.mockRestore();
  });
});
