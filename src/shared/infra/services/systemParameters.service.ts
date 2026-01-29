import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../db/prisma/prisma.service';

@Injectable()
export class SystemParameterService implements OnModuleInit {
  private cache: Map<string, string> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // await this.loadParameters();
  }

  // @Cron(CronExpression.EVERY_HOUR)
  // async loadParameters() {
  //   const parameters = await this.prisma.systemParameters.findMany({ where: { status: DefaultStatus.ACTIVE } });

  //   parameters.forEach((param) => {
  //     this.cache.set(param.key, param.value);
  //   });
  // }

  getValue<T = string>(key: string, defaultValue?: T): T {
    const value = this.cache.get(key);
    if (!value) return defaultValue as T;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  getValueAsString(key: string, defaultValue = ''): string {
    return this.cache.get(key) || defaultValue;
  }

  getValueAsNumber(key: string, defaultValue = 0): number {
    const value = this.cache.get(key);
    if (!value) return defaultValue;
    return Number(value) || defaultValue;
  }

  getValueAsBoolean(key: string, defaultValue = false): boolean {
    const value = this.cache.get(key);
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  getValueAsArray<T = string>(key: string, defaultValue: T[] = []): T[] {
    const value = this.cache.get(key);
    if (!value) return defaultValue;

    try {
      return JSON.parse(value) as T[];
    } catch {
      return defaultValue;
    }
  }

  getValueAsObject<T extends object>(key: string, defaultValue: T): T {
    const value = this.cache.get(key);
    if (!value) return defaultValue;

    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
}
