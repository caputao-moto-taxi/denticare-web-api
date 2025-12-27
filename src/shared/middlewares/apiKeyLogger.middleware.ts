import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class ApiKeyLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ApiKeyLogger');

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    const ip = req.ip || req.connection.remoteAddress;
    const method = req.method;
    const url = req.originalUrl;

    if (apiKey) {
      this.logger.log(`[${new Date().toISOString()}] API Key: ${apiKey} | IP: ${ip} | ${method} ${url}`);
    }

    next();
  }
}
