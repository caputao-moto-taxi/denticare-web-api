import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { DoctorsUseCases } from './application/useCases/doctors.use-cases';
import { IDoctorRepository } from './domain/doctor.repository';
import { DoctorsPrismaRepository } from './infra/db/prisma/doctors-prisma.repository';

const REPOSITORIES = {
  DOCTOR_REPOSITORY: {
    provide: 'DoctorRepository',
    useExisting: DoctorsPrismaRepository,
  },
  DOCTOR_PRISMA_REPOSITORY: {
    provide: DoctorsPrismaRepository,
    useFactory: (prismaService: PrismaService, hashService: IHashService) =>
      new DoctorsPrismaRepository(prismaService, hashService),
    inject: [PrismaService, 'IHashService'],
  },
};

const USE_CASES = {
  DOCTORS_USE_CASES: {
    provide: DoctorsUseCases,
    useFactory: (doctorRepository: IDoctorRepository) =>
      new DoctorsUseCases(doctorRepository),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide],
  },
};

export const DOCTOR_PROVIDERS = { REPOSITORIES, USE_CASES };
