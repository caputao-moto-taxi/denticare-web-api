import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  DoctorCreateCommand,
  DoctorUpdateCommand,
  IDoctorRepository,
} from '../../domain/doctor.repository';

export class DoctorsUseCases {
  constructor(private readonly doctorRepository: IDoctorRepository) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.doctorRepository.list(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.doctorRepository.findOne(user, id);
  }

  create(user: AuthUser, input: DoctorCreateCommand) {
    return this.doctorRepository.create(user, input);
  }

  update(user: AuthUser, id: string, input: DoctorUpdateCommand) {
    return this.doctorRepository.update(user, id, input);
  }

  remove(user: AuthUser, id: string) {
    return this.doctorRepository.remove(user, id);
  }
}
