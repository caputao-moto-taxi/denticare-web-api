import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { validateListFilters } from '../../../../shared/helpers/list-filters';
import { IDoctorRepository } from '../../../domain/doctor.repository';

export type ListDoctorsInput = { user: AuthUser; query?: ListQuery };

export class ListDoctorsUseCase {
  constructor(private readonly repository: IDoctorRepository) {}

  execute({ user, query }: ListDoctorsInput) {
    if (query) {
      validateListFilters(query, {
        status: ['active', 'inactive'],
        specialty: true,
        type: ['FULL_TIME', 'PART_TIME'],
      });
      if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
        throw new BadRequestException('Start date must not be after end date');
      }
    }
    return this.repository.list(user.branchId, query);
  }
}
