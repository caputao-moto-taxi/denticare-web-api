import { IStorage } from '../../application/storage.interface';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { Buffer } from 'buffer';

export class AwsS3Storage implements IStorage {
  constructor(
    private storageSdk: S3Client,
    private bucketName: string,
  ) {}

  async store(object: {
    data: Buffer;
    mime_type?: string | undefined;
    id: string;
  }): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: object.id,
      ContentType: object.mime_type,
      Body: object.data,
    });

    await this.storageSdk.send(command);
  }

  async get(
    id: string,
  ): Promise<{ data: Buffer; mime_type: string | undefined }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: id,
    });

    const response = await this.storageSdk.send(command);
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return {
      data: Buffer.concat(chunks),
      mime_type: response.ContentType,
    };
  }
}
