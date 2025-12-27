import { S3Client } from '@aws-sdk/client-s3';
import { AwsS3Storage } from '../aws-s3.storage';
import { Config } from '../../config';

describe('AwsS3Storage Integration Test', () => {
  let awsS3Storage: AwsS3Storage;

  beforeEach(() => {
    const storageSdk = new S3Client(Config.cloudFlareCredentials());

    awsS3Storage = new AwsS3Storage(storageSdk, Config.bucketName());
  });

  it('should store a file', async () => {
    // await awsS3Storage.store({
    //   data: Buffer.from('data'),
    //   id: 'location/1.txt',
    //   mime_type: 'text/plain',
    // });
    // const file = await awsS3Storage.get('location/1.txt');
    // expect(file.data.toString()).toBe('data');
    // expect(file.mime_type).toBe('text/plain');
  }, 10000);
});
