import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import {
  AppointmentId,
  assertCanAccess,
  IAppointmentRepository,
} from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import { findAppointmentView } from '../../common/appointment.loaders';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../../common/appointment.output';

export type GetAppointmentInput = { user: AuthUser; id: string };

export class GetAppointmentUseCase implements IUseCase<
  GetAppointmentInput,
  AppointmentOutput | AppointmentErrorBody
> {
  constructor(private readonly _repository: IAppointmentRepository) {}

  async execute({
    user,
    id,
  }: GetAppointmentInput): Promise<
    HttpResponse<AppointmentOutput | AppointmentErrorBody>
  > {
    try {
      const view = await findAppointmentView(
        this._repository,
        user,
        AppointmentId.parse(id),
      );
      assertCanAccess(user, { doctorId: view.doctor.id });
      return successResponse(AppointmentOutputMapper.toOutput(view));
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }
}
