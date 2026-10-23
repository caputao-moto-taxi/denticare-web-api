import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  AppointmentClinic,
  IAppointmentClinicRepository,
} from '../../../domain';

export class AppointmentClinicPrismaRepository implements IAppointmentClinicRepository {
  constructor(private readonly _prismaService: PrismaService) {}

  findByBranchId(branchId: string): Promise<AppointmentClinic | null> {
    return this._prismaService.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { workingDays: true, workingHours: true, timezone: true },
    });
  }
}
