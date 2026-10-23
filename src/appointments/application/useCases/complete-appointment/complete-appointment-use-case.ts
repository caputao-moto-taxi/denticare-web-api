import { AuthUser } from '../../../../auth/auth-user';
import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { assertCanComplete, IAppointmentRepository } from '../../../domain';
import {
  AppointmentErrorBody,
  toAppointmentErrorResponse,
} from '../../common/appointment-error.mapper';
import {
  findAccessibleAppointment,
  findAppointmentOutput,
} from '../../common/appointment.loaders';
import { AppointmentOutput } from '../../common/appointment.output';

export type CompleteAppointmentInput = { user: AuthUser; id: string };

export class CompleteAppointmentUseCase implements IUseCase<
  CompleteAppointmentInput,
  AppointmentOutput | AppointmentErrorBody
> {
  constructor(private readonly _repository: IAppointmentRepository) {}

  async execute({
    user,
    id,
  }: CompleteAppointmentInput): Promise<
    HttpResponse<AppointmentOutput | AppointmentErrorBody>
  > {
    try {
      assertCanComplete(user);
      const appointment = await findAccessibleAppointment(
        this._repository,
        user,
        id,
      );
      appointment.complete();
      await this._repository.update(appointment);
      return successResponse(
        await findAppointmentOutput(this._repository, user, appointment.id),
      );
    } catch (error) {
      return toAppointmentErrorResponse(error);
    }
  }
}
