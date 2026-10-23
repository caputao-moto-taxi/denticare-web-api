import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'node:https';
import { PatientExamStorage } from './patient-exam-storage';

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest
    .fn()
    .mockImplementation((config) => ({ config, send: mockS3Send })),
  PutObjectCommand: jest.fn((input) => input),
  GetObjectCommand: jest.fn((input) => input),
  DeleteObjectCommand: jest.fn((input) => input),
}));

jest.mock('@smithy/node-http-handler', () => ({
  NodeHttpHandler: jest.fn().mockImplementation((options) => ({ options })),
}));

describe('PatientExamStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send.mockResolvedValue({});
  });

  it('requires TLS 1.2 or newer and validates the R2 certificate', async () => {
    const storage = new PatientExamStorage(
      new ConfigService({
        R2_ENDPOINT: 'https://storage.example.test',
        R2_BUCKET: 'dentcare',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
      }),
    );

    await storage.store({
      id: 'logo.png',
      data: Buffer.from('image'),
      mimeType: 'image/png',
    });

    const handlerOptions = jest.mocked(NodeHttpHandler).mock.calls[0][0];
    const httpsAgent = handlerOptions.httpsAgent as HttpsAgent;
    expect(httpsAgent.options).toEqual(
      expect.objectContaining({
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      }),
    );
    expect(jest.mocked(S3Client).mock.calls[0][0]).toEqual(
      expect.objectContaining({ requestHandler: expect.anything() }),
    );
  });

  it('reports an actionable error when R2 TLS certificate verification fails', async () => {
    mockS3Send.mockRejectedValue(
      Object.assign(new Error('request failed'), {
        cause: Object.assign(new Error('certificate rejected'), {
          code: 'SELF_SIGNED_CERT_IN_CHAIN',
        }),
      }),
    );
    const storage = new PatientExamStorage(
      new ConfigService({
        R2_ENDPOINT: 'https://storage.example.test',
        R2_BUCKET: 'dentcare',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
      }),
    );

    await expect(
      storage.store({
        id: 'payment-proof',
        data: Buffer.from('file'),
        mimeType: 'application/pdf',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
