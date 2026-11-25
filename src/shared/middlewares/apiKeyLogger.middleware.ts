import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class ApiKeyLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ApiKeyLogger');

  use(req: Request, res: Response, next: NextFunction) {
    const apiKeyProvided = Boolean(req.headers['x-api-key']);
    const ip = req.ip || req.socket.remoteAddress;
    const method = req.method;
    const path = req.path.slice(0, 200);

    if (apiKeyProvided) {
      this.logger.log(
        `[${new Date().toISOString()}] API key provided | IP: ${ip} | ${method} ${path}`,
      );
    }

    next();
  }
}
