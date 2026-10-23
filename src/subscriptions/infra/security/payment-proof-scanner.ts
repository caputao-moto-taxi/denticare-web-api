import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';

export abstract class PaymentProofScanner {
  abstract scan(data: Buffer): Promise<void>;
}

@Injectable()
export class ClamAvPaymentProofScanner extends PaymentProofScanner {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async scan(data: Buffer): Promise<void> {
    const host = this.config.get<string>('CLAMAV_HOST')?.trim();
    const portValue = this.config.get<string>('CLAMAV_PORT')?.trim();
    const port = Number(portValue);
    if (!host || !portValue || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException(
        'Payment proof malware scanning is not configured',
      );
    }

    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host, port });
      let response = '';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve();
      };

      socket.setTimeout(10_000, () =>
        finish(new ServiceUnavailableException('Payment proof scanner timed out')),
      );
      socket.once('error', () =>
        finish(new ServiceUnavailableException('Payment proof scanner is unavailable')),
      );
      socket.once('connect', () => {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length);
        socket.write(Buffer.from('zINSTREAM\0'));
        socket.write(length);
        socket.write(data);
        socket.write(Buffer.alloc(4));
      });
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
        if (response.includes('FOUND')) {
          finish(new BadRequestException('The uploaded payment proof was rejected'));
        } else if (response.includes('OK')) {
          finish();
        } else if (response.length > 1024) {
          finish(
            new ServiceUnavailableException(
              'Payment proof scanner returned an invalid response',
            ),
          );
        }
      });
      socket.once('end', () => {
        if (!settled) {
          finish(
            new ServiceUnavailableException(
              'Payment proof scanner did not confirm the file status',
            ),
          );
        }
      });
    });
  }
}
