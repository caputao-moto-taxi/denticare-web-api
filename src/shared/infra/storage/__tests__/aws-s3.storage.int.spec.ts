import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Config } from '../../config';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';

Config.readEnv();
const integrationEnabled =
  process.env.RUN_R2_INTEGRATION_TESTS === 'true' &&
  Boolean(
    Config.env.R2_ENDPOINT &&
    Config.env.R2_ACCESS_KEY_ID &&
    Config.env.R2_SECRET_ACCESS_KEY &&
    Config.env.R2_BUCKET,
  );

const describeR2 = integrationEnabled ? describe : describe.skip;

describeR2('AwsS3Storage R2 integration', () => {
  const config = new ConfigService(Config.env);
  const storage = new PatientExamStorage(config);

  it('uploads, reads, and removes an isolated test object', async () => {
    const id = `integration-tests/${randomUUID()}.txt`;
    const contents = `R2 upload integration test ${randomUUID()}`;

    try {
      await storage.store({
        id,
        data: Buffer.from(contents),
        mimeType: 'text/plain',
      });
      const file = await storage.get(id);

      expect(file.data.toString()).toBe(contents);
      expect(file.mime_type).toBe('text/plain');
    } finally {
      await storage.delete(id);
    }
  }, 10000);
});
