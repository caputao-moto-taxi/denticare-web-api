import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import {
  ListQuery,
  PaginatedResult,
  paginated,
} from '../../../../shared/domain/list-query';
import { validateListFilters } from '../../../../shared/helpers/list-filters';
import {
  AppointmentListCriteria,
  AppointmentRuleViolationError,
  AppointmentStatus,
  IAppointmentPatientRepository,
  IAppointmentRepository,
  listVisibilityFor,
} from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../../common/appointment.output';

export type ListAppointmentsInput = { user: AuthUser; query?: ListQuery };

type ListAppointmentsOutput = PaginatedResult<AppointmentOutput>;

const FILTERABLE_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.COMPLETED,
];

export class ListAppointmentsUseCase implements IUseCase<
  ListAppointmentsInput,
  ListAppointmentsOutput | AppointmentErrorBody
> {
  constructor(
    private readonly _repository: IAppointmentRepository,
    private readonly _patients: IAppointmentPatientRepository,
  ) {}

  async execute({
    user,
    query = {},
  }: ListAppointmentsInput): Promise<
    HttpResponse<ListAppointmentsOutput | AppointmentErrorBody>
  > {
    try {
      validateListFilters(query, {
        status: FILTERABLE_STATUSES.map((status) => status.toLowerCase()),
        doctorId: true,
        patientId: true,
      });
      if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
        throw new AppointmentRuleViolationError(
          'Start date must not be after end date',
        );
      }

      const criteria: AppointmentListCriteria = {
        branchId: user.branchId,
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        doctorId: query.doctorId,
        patientId: query.patientId,
        status: FILTERABLE_STATUSES.find(
          (status) => status.toLowerCase() === query.status,
        ),
      };

      const visibility = listVisibilityFor(user);
      if (visibility === 'patient') {
        const patient = await this._patients.findOne({
          branchId: user.branchId,
          userId: user.id,
        });
        if (!patient) return successResponse(paginated([], 0, query));
        criteria.restrictToPatientId = patient.id;
      } else if (visibility === 'assigned') {
        criteria.restrictToDoctorId = user.id;
      }

      const result = await this._repository.listPaginated(criteria);
      return successResponse({
        ...result,
        data: result.data.map((view) => AppointmentOutputMapper.toOutput(view)),
      });
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }
}
