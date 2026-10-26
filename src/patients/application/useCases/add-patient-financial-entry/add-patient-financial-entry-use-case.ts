import { AuthUser } from '../../../../auth/auth-user';
import { randomUUID } from 'node:crypto';
import {
  IPatientRepository,
  PatientFinancialEntryCommand,
} from '../../../domain/patient.repository';
import { requirePatientStaff } from '../../patient-access.policy';

export type AddPatientFinancialEntryInput = {
  user: AuthUser;
  id: string;
  financialEntry: PatientFinancialEntryCommand;
};

export class AddPatientFinancialEntryUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  async execute({ user, id, financialEntry }: AddPatientFinancialEntryInput) {
    requirePatientStaff(user);
    const entryId = randomUUID();
    const reference = `REG-${entryId.slice(0, 8).toUpperCase()}`;
    const entry = await this.repository.addFinancialEntry(
      user,
      id,
      { ...financialEntry, description: financialEntry.description.trim() },
      entryId,
      reference,
    );

    return {
      id: entry.id,
      reference: entry.reference,
      description: entry.description,
      amount: `${entry.amount.toLocaleString('pt-PT', {
        maximumFractionDigits: 2,
      })} Kz`,
      method: entry.method,
      date: entry.createdAt.toISOString(),
      status: entry.status,
    };
  }
}
