import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  ClinicScheduleRecord,
  ClinicScheduleUpdateData,
  IClinicScheduleRepository,
} from '../../../domain/clinic-schedule.repository';

@Injectable()
export class ClinicSchedulePrismaRepository implements IClinicScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(branchId: string): Promise<ClinicScheduleRecord | null> {
    return this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        deletedAt: true,
        workingDays: true,
        workingHours: true,
        timezone: true,
      },
    });
  }

  update(
    branchId: string,
    data: ClinicScheduleUpdateData,
  ): Promise<ClinicScheduleRecord> {
    return this.prisma.branch.update({
      where: { id: branchId },
      data: {
        workingDays: data.workingDays,
        workingHours: data.workingHours as Prisma.InputJsonValue,
        ...(data.timezone !== undefined && { timezone: data.timezone }),
      },
      select: {
        deletedAt: true,
        workingDays: true,
        workingHours: true,
        timezone: true,
      },
    });
  }
}
