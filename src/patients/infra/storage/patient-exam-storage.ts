import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'node:https';
import { IStorage } from '../../../shared/application/storage.interface';
import { AwsS3Storage } from '../../../shared/infra/storage/aws-s3.storage';
import { IPatientFileStorage } from '../../application/interfaces/patient-file-storage.interface';

@Injectable()
export class PatientExamStorage implements IPatientFileStorage {
  private readonly logger = new Logger(PatientExamStorage.name);
  private storage?: IStorage;

  constructor(private readonly config: ConfigService) {}

  store(file: { id: string; data: Buffer; mimeType: string }) {
    return this.handleStorageError(() =>
      this.getStorage().store({
        id: file.id,
        data: file.data,
        mime_type: file.mimeType,
      }),
    );
  }

  get(id: string) {
    return this.handleStorageError(() => this.getStorage().get(id));
  }

  delete(id: string) {
    return this.handleStorageError(() => this.getStorage().delete(id));
  }

  private async handleStorageError<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (this.isTlsCertificateError(error)) {
        this.logger.error(
          'R2 endpoint TLS certificate is not trusted; configure R2_ENDPOINT with a trusted HTTPS endpoint',
        );
        throw new ServiceUnavailableException(
          'Secure file storage could not validate its TLS certificate. Configure R2_ENDPOINT with a trusted HTTPS endpoint.',
        );
      }
      throw error;
    }
  }

  private isTlsCertificateError(error: unknown) {
    let current: unknown = error;
    for (let depth = 0; depth < 5; depth += 1) {
      if (typeof current !== 'object' || current === null) return false;
      if (
        'code' in current &&
        typeof current.code === 'string' &&
        [
          'SELF_SIGNED_CERT_IN_CHAIN',
          'DEPTH_ZERO_SELF_SIGNED_CERT',
          'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        ].includes(current.code)
      ) {
        return true;
      }
      current = 'cause' in current ? current.cause : undefined;
    }
    return false;
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
        requestHandler: new NodeHttpHandler({
          httpsAgent: new HttpsAgent({
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true,
          }),
        }),
      }),
      bucketName,
    );
    return this.storage;
  }
}
