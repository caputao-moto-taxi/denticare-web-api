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
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    user: process.env.GMAIL_USER,
    appPassword: process.env.GMAIL_APP_PASSWORD,
    frontendUrl: process.env.FRONTEND_URL,
    smtpTlsCa: process.env.SMTP_TLS_CA_CERT,
  };
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_USER = 'mailer@example.test';
    process.env.SMTP_PASSWORD = 'mailbox-password';
    process.env.FRONTEND_URL = 'https://dentcare.example';
    delete process.env.SMTP_TLS_CA_CERT;
    sendMailMock = jest.fn().mockResolvedValue({});
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
  });

  afterAll(() => {
    if (originalEnvironment.smtpUser === undefined) {
      delete process.env.SMTP_USER;
    } else {
      process.env.SMTP_USER = originalEnvironment.smtpUser;
    }
    if (originalEnvironment.smtpPassword === undefined) {
      delete process.env.SMTP_PASSWORD;
    } else {
      process.env.SMTP_PASSWORD = originalEnvironment.smtpPassword;
    }
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
      host: 'mail.aquatecnica.ao',
      port: 465,
      secure: true,
      auth: { user: 'mailer@example.test', pass: 'mailbox-password' },
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

  it('accepts the mailbox password configured for the SMTP provider', async () => {
    const service = new NodemailerAuthEmailService();

    expect(() => service.assertConfigured()).not.toThrow();
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

  it('logs actionable guidance and returns a service error on SMTP timeout', async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    sendMailMock.mockRejectedValue(
      Object.assign(new Error('connection timed out'), {
        code: 'ETIMEDOUT',
        command: 'CONN',
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
      'Email delivery failed (code=ETIMEDOUT, smtp=none, command=CONN); verify SMTP host and outbound network access on port 465',
    );
    loggerError.mockRestore();
  });

  it('logs the original network details when Nodemailer wraps a timeout', async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    sendMailMock.mockRejectedValue(
      Object.assign(new Error('connect ETIMEDOUT'), {
        code: 'ESOCKET',
        originalCode: 'ETIMEDOUT',
        syscall: 'connect',
        address: '65.108.145.65',
        port: 465,
        command: 'CONN',
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
      'Email delivery failed (code=ETIMEDOUT, transport=ESOCKET, smtp=none, command=CONN, syscall=connect, address=65.108.145.65, port=465); verify SMTP host and outbound network access on port 465',
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
