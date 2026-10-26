import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientPrescriptionCommand,
} from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';

export type AddPatientPrescriptionInput = {
  user: AuthUser;
  id: string;
  prescription: PatientPrescriptionCommand;
};

export class AddPatientPrescriptionUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  async execute({ user, id, prescription }: AddPatientPrescriptionInput) {
    requirePatientClinicalAccess(user);
    if (prescription.items.length === 0) {
      throw new BadRequestException('At least one prescription item is required');
    }

    const groupId = randomUUID();
    const normalizedPrescription = {
      items: prescription.items.map((item) => ({
        medication: item.medication.trim(),
        dosage: item.dosage.trim(),
        instructions: item.instructions.trim(),
        duration: item.duration.trim(),
      })),
    };
    const prescriptions = await this.repository.addPrescription(
      user,
      id,
      normalizedPrescription,
      groupId,
    );
    const firstPrescription = prescriptions[0];

    return {
      id: groupId,
      items: prescriptions.map(({ medication, dosage, instructions, duration }) => ({
        medication,
        dosage,
        instructions,
        duration,
      })),
      prescribedBy: firstPrescription.doctor.username,
      date: firstPrescription.createdAt.toISOString(),
      status: 'active',
    };
  }
}
