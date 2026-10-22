import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import {
  CreateDoctorUseCase,
  DeleteDoctorUseCase,
  GetDoctorUseCase,
  ListDoctorsUseCase,
  UpdateDoctorUseCase,
} from './application/useCases';
import { IDoctorRepository } from './domain/doctor.repository';
import { DoctorsPrismaRepository } from './infra/db/prisma/doctors-prisma.repository';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { ManageDoctorAvatarUseCase } from './application/useCases';

const REPOSITORIES = {
  DOCTOR_REPOSITORY: {
    provide: 'DoctorRepository',
    useExisting: DoctorsPrismaRepository,
  },
  DOCTOR_PRISMA_REPOSITORY: {
    provide: DoctorsPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new DoctorsPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  MANAGE_DOCTOR_AVATAR_USE_CASE: {
    provide: ManageDoctorAvatarUseCase,
    useFactory: (repository: IDoctorRepository, storage: PatientExamStorage) =>
      new ManageDoctorAvatarUseCase(repository, storage),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide, PatientExamStorage],
  },
  LIST_DOCTORS_USE_CASE: {
    provide: ListDoctorsUseCase,
    useFactory: (doctorRepository: IDoctorRepository) =>
      new ListDoctorsUseCase(doctorRepository),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide],
  },
  GET_DOCTOR_USE_CASE: {
    provide: GetDoctorUseCase,
    useFactory: (doctorRepository: IDoctorRepository) =>
      new GetDoctorUseCase(doctorRepository),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide],
  },
  CREATE_DOCTOR_USE_CASE: {
    provide: CreateDoctorUseCase,
    useFactory: (
      doctorRepository: IDoctorRepository,
      hashService: IHashService,
    ) => new CreateDoctorUseCase(doctorRepository, hashService),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide, 'IHashService'],
  },
  UPDATE_DOCTOR_USE_CASE: {
    provide: UpdateDoctorUseCase,
    useFactory: (doctorRepository: IDoctorRepository) =>
      new UpdateDoctorUseCase(doctorRepository),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide],
  },
  DELETE_DOCTOR_USE_CASE: {
    provide: DeleteDoctorUseCase,
    useFactory: (doctorRepository: IDoctorRepository) =>
      new DeleteDoctorUseCase(doctorRepository),
    inject: [REPOSITORIES.DOCTOR_REPOSITORY.provide],
  },
};

export const DOCTOR_PROVIDERS = { REPOSITORIES, USE_CASES };
