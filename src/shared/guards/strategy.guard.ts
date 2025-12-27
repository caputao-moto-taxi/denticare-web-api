import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../infra/db/prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyHeader = request.headers['x-api-key'];

    if (!apiKeyHeader) {
      throw new UnauthorizedException('API Key is missing');
    }

    const isValid = await this.validateKey(apiKeyHeader as string);

    if (!isValid) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return true;
  }

  private async validateKey(key: string): Promise<boolean> {
    const application = await this.prisma.notification_applications.findFirst({
      where: { api_key: key },
    });

    return !!application;
  }
}
