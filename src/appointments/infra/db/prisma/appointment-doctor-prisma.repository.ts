import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  AppointmentDoctor,
  DoctorWorkingProfile,
  IAppointmentDoctorRepository,
} from '../../../domain';

export class AppointmentDoctorPrismaRepository implements IAppointmentDoctorRepository {
  constructor(private readonly _prismaService: PrismaService) {}

  async findActive(
    branchId: string,
    doctorId?: string,
  ): Promise<AppointmentDoctor[]> {
    const doctors = await this._prismaService.user.findMany({
      where: {
        branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'doctor' },
        ...(doctorId && { id: doctorId }),
      },
      include: { doctorProfile: true },
      orderBy: { createdAt: 'asc' },
    });
    return doctors.map((doctor) => ({
      id: doctor.id,
      profile: doctor.doctorProfile,
    }));
  }

  async findProfile(doctorId: string): Promise<DoctorWorkingProfile | null> {
    return this._prismaService.doctorProfile.findUnique({
      where: { userId: doctorId },
      select: { workingDays: true, workingHours: true },
    });
  }
}
