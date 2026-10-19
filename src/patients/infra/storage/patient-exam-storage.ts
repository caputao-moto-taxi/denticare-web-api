import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { IStorage } from '../../../shared/application/storage.interface';
import { AwsS3Storage } from '../../../shared/infra/storage/aws-s3.storage';

@Injectable()
export class PatientExamStorage {
  private storage?: IStorage;

  constructor(private readonly config: ConfigService) {}

  store(file: { id: string; data: Buffer; mimeType: string }) {
    return this.getStorage().store({
      id: file.id,
      data: file.data,
      mime_type: file.mimeType,
    });
  }

  get(id: string) {
    return this.getStorage().get(id);
  }

  delete(id: string) {
    return this.getStorage().delete(id);
  }

  private getStorage() {
    if (this.storage) return this.storage;

    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId =
      this.config.get<string>('R2_ACCESS_KEY_ID') ??
      this.config.get<string>('CLOUDFLARE_AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const legacySecretAccessKey = this.config.get<string>(
      'CLOUDFLARE_AWS_SECRET_ACCESS_KEY',
    );
    const bucketName =
      this.config.get<string>('R2_BUCKET') ??
      this.config.get<string>('CLOUDFLARE_AWS_BUCKET_NAME');
    const resolvedEndpoint =
      endpoint ??
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    const resolvedSecretAccessKey = secretAccessKey ?? legacySecretAccessKey;
    if (
      !resolvedEndpoint ||
      !accessKeyId ||
      !resolvedSecretAccessKey ||
      !bucketName
    ) {
      throw new ServiceUnavailableException(
        'Patient exam storage is not configured',
      );
    }

    this.storage = new AwsS3Storage(
      new S3Client({
        endpoint: resolvedEndpoint,
        region: 'auto',
        credentials: {
          accessKeyId,
          secretAccessKey: resolvedSecretAccessKey,
        },
      }),
      bucketName,
    );
    return this.storage;
  }
}
