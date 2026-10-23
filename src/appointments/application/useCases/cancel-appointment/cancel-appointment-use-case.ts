import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { IAppointmentRepository } from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import {
  findAccessibleAppointment,
  findAppointmentOutput,
} from '../../common/appointment.loaders';
import { AppointmentOutput } from '../../common/appointment.output';

export type CancelAppointmentInput = { user: AuthUser; id: string };

export class CancelAppointmentUseCase implements IUseCase<
  CancelAppointmentInput,
  AppointmentOutput | AppointmentErrorBody
> {
  constructor(private readonly _repository: IAppointmentRepository) {}

  async execute({
    user,
    id,
  }: CancelAppointmentInput): Promise<
    HttpResponse<AppointmentOutput | AppointmentErrorBody>
  > {
    try {
      const appointment = await findAccessibleAppointment(
        this._repository,
        user,
        id,
      );
      appointment.cancel();
      await this._repository.update(appointment);
      return successResponse(
        await findAppointmentOutput(this._repository, user, appointment.id),
      );
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }
}
