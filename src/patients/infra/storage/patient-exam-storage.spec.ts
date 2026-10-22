import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'node:https';
import { rootCertificates } from 'node:tls';
import { PatientExamStorage } from './patient-exam-storage';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config) => ({
    config,
    send: jest.fn().mockResolvedValue({}),
  })),
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
  });

  it('adds the configured R2 CA while retaining Node trusted roots', async () => {
    const ca =
      '-----BEGIN CERTIFICATE-----\ntrusted-root\n-----END CERTIFICATE-----';
    const storage = new PatientExamStorage(
      new ConfigService({
        R2_ENDPOINT: 'https://storage.example.test',
        R2_BUCKET: 'dentcare',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
        R2_TLS_CA_CERT: ca.replace(/\n/g, '\\n'),
      }),
    );

    await storage.store({
      id: 'logo.png',
      data: Buffer.from('image'),
      mimeType: 'image/png',
    });

    expect(NodeHttpHandler).toHaveBeenCalledTimes(1);
    const handlerOptions = jest.mocked(NodeHttpHandler).mock.calls[0][0];
    const httpsAgent = handlerOptions.httpsAgent as HttpsAgent;
    expect(httpsAgent.options.ca).toEqual([...rootCertificates, ca]);
    expect(jest.mocked(S3Client).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        endpoint: 'https://storage.example.test',
        requestHandler: expect.anything(),
      }),
    );
  });

  it('uses the default S3 TLS handler when no custom CA is configured', async () => {
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

    expect(NodeHttpHandler).not.toHaveBeenCalled();
    expect(jest.mocked(S3Client).mock.calls[0][0]).not.toHaveProperty(
      'requestHandler',
    );
  });
});
