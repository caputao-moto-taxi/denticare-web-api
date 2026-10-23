import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  AppointmentPatient,
  AppointmentPatientLookup,
  IAppointmentPatientRepository,
} from '../../../domain';

export class AppointmentPatientPrismaRepository implements IAppointmentPatientRepository {
  constructor(private readonly _prismaService: PrismaService) {}

  findOne({
    branchId,
    id,
    userId,
  }: AppointmentPatientLookup): Promise<AppointmentPatient | null> {
    return this._prismaService.person.findFirst({
      where: {
        ...(id !== undefined && { id }),
        ...(userId !== undefined && { userId }),
        branchId,
        deletedAt: null,
        Role: { slug: 'patient' },
      },
      select: { id: true },
    });
  }
}
