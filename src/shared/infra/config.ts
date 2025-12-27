import { config as readEnv } from 'dotenv';
import { join } from 'path';

export class Config {
  static env: any = null;

  static db() {
    Config.readEnv();

    return {
      dialect: 'sqlite' as any,
      host: Config.env.DB_HOST,
      logging: Config.env.DB_LOGGING === 'true',
    };
  }

  static bucketName() {
    Config.readEnv();

    // return Config.env.GOOGLE_CLOUD_STORAGE_BUCKET_NAME;
    return Config.env.CLOUDFLARE_AWS_BUCKET_NAME;
  }

  static googleCredentials() {
    Config.readEnv();

    return JSON.parse(Config.env.GOOGLE_CLOUD_CREDENTIALS);
  }

  static cloudFlareCredentials() {
    Config.readEnv();

    return {
      endpoint: `https://${Config.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId: Config.env.CLOUDFLARE_AWS_ACCESS_KEY_ID,
        secretAccessKey: Config.env.CLOUDFLARE_AWS_SECRET_ACCESS_KEY,
      },
    };
  }

  static readEnv() {
    if (Config.env) {
      return;
    }

    const { parsed } = readEnv({
      path: join(__dirname, `../../../../.env.${process.env.NODE_ENV}`),
    });

    Config.env = {
      ...parsed,
      ...process.env,
    };
  }
}
