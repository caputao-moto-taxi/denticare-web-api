import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './strategy.guard';

export function ApiKeyAuth() {
  return applyDecorators(UseGuards(ApiKeyGuard));
}
