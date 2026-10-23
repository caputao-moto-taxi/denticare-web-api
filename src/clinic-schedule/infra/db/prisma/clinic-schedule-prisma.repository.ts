import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { APPOINTMENT_SLOT_DURATION_MS } from '../../../../appointments/domain/appointment-time';
import { AuthUser } from '../../../../auth/auth-user';
import {
  DaySchedule,
  isValidTimezone,
  resolveClinicSchedule,
  validateWeeklySchedule,
} from '../../../../shared/helpers/schedule';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  IClinicScheduleRepository,
  UpdateClinicScheduleCommand,
} from '../../../domain/clinic-schedule.repository';

@Injectable()
export class ClinicSchedulePrismaRepository implements IClinicScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthUser) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: user.branchId, deletedAt: null },
      select: { workingDays: true, workingHours: true, timezone: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return this.toResponse(branch);
  }

  async update(user: AuthUser, input: UpdateClinicScheduleCommand) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only clinic administrators can change the opening hours',
      );
    }
    const problems = validateWeeklySchedule(input);
    if (input.timezone !== undefined && !isValidTimezone(input.timezone)) {
      problems.push('timezone must be a valid IANA time zone');
    }
    if (problems.length > 0) throw new BadRequestException(problems);

    // Only the listed days are kept, so closed days cannot leave stale hours behind.
    const workingHours = Object.fromEntries(
      input.workingDays.map((day) => {
        const { start, end, lunchStart, lunchEnd } = input.workingHours[day];
        return [
          day,
          {
            start,
            end,
            ...(lunchStart && lunchEnd && { lunchStart, lunchEnd }),
          },
        ];
      }),
    );

    const branch = await this.prisma.branch.update({
      where: { id: user.branchId },
      data: {
        workingDays: input.workingDays,
        workingHours: workingHours as Prisma.InputJsonValue,
        ...(input.timezone && { timezone: input.timezone }),
      },
      select: { workingDays: true, workingHours: true, timezone: true },
    });
    return this.toResponse(branch);
  }

  private toResponse(branch: {
    workingDays: string[];
    workingHours: Prisma.JsonValue;
    timezone: string;
  }) {
    const schedule = resolveClinicSchedule(branch);
    return {
      workingDays: schedule.workingDays,
      workingHours: schedule.workingHours as Record<string, DaySchedule>,
      timezone: branch.timezone,
      slotDurationMinutes: APPOINTMENT_SLOT_DURATION_MS / 60_000,
      isDefault: branch.workingDays.length === 0 || !branch.workingHours,
    };
  }
}
