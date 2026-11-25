import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Socket } from 'socket.io';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient<Socket>();
      return {
        req: {
          ip: client.handshake.address,
          headers: client.handshake.headers,
        },
        res: { header: () => undefined },
      };
    }

    return super.getRequestResponse(context);
  }
}
