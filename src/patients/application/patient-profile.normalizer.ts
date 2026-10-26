import {
  PatientCreateCommand,
  PatientUpdateCommand,
} from '../domain/patient.repository';

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim();
}

function normalizeList(values: string[] | undefined) {
  return values?.map((value) => value.trim()).filter(Boolean);
}

export function normalizePatientCreateCommand(
  input: PatientCreateCommand,
): PatientCreateCommand {
  return {
    ...input,
    name: normalizeName(input.name),
    email: input.email?.trim().toLowerCase() || null,
    phone: normalizeOptionalText(input.phone),
    address: input.address.trim(),
    medicalNotes: normalizeOptionalText(input.medicalNotes),
    idNumber: normalizeOptionalText(input.idNumber),
    nif: normalizeOptionalText(input.nif),
    profession: normalizeOptionalText(input.profession),
    insuranceProvider: normalizeOptionalText(input.insuranceProvider),
    insurancePlan: normalizeOptionalText(input.insurancePlan),
    insurancePolicyNumber: normalizeOptionalText(input.insurancePolicyNumber),
    emergencyContactName: normalizeOptionalText(input.emergencyContactName),
    emergencyContactRelationship: normalizeOptionalText(
      input.emergencyContactRelationship,
    ),
    emergencyContactPhone: normalizeOptionalText(input.emergencyContactPhone),
    allergies: normalizeList(input.allergies),
    medicalConditions: normalizeList(input.medicalConditions),
    medications: normalizeList(input.medications),
  };
}

export function normalizePatientUpdateCommand(
  input: PatientUpdateCommand,
): PatientUpdateCommand {
  return {
    ...input,
    ...(input.name !== undefined && { name: normalizeName(input.name) }),
    ...(input.email !== undefined && {
      email: input.email?.trim().toLowerCase() || null,
    }),
    ...(input.phone !== undefined && {
      phone: normalizeOptionalText(input.phone),
    }),
    ...(input.address !== undefined && { address: input.address.trim() }),
    ...(input.medicalNotes !== undefined && {
      medicalNotes: normalizeOptionalText(input.medicalNotes),
    }),
    ...(input.idNumber !== undefined && {
      idNumber: normalizeOptionalText(input.idNumber),
    }),
    ...(input.nif !== undefined && { nif: normalizeOptionalText(input.nif) }),
    ...(input.profession !== undefined && {
      profession: normalizeOptionalText(input.profession),
    }),
    ...(input.insuranceProvider !== undefined && {
      insuranceProvider: normalizeOptionalText(input.insuranceProvider),
    }),
    ...(input.insurancePlan !== undefined && {
      insurancePlan: normalizeOptionalText(input.insurancePlan),
    }),
    ...(input.insurancePolicyNumber !== undefined && {
      insurancePolicyNumber: normalizeOptionalText(input.insurancePolicyNumber),
    }),
    ...(input.emergencyContactName !== undefined && {
      emergencyContactName: normalizeOptionalText(input.emergencyContactName),
    }),
    ...(input.emergencyContactRelationship !== undefined && {
      emergencyContactRelationship: normalizeOptionalText(
        input.emergencyContactRelationship,
      ),
    }),
    ...(input.emergencyContactPhone !== undefined && {
      emergencyContactPhone: normalizeOptionalText(input.emergencyContactPhone),
    }),
    ...(input.allergies !== undefined && {
      allergies: normalizeList(input.allergies),
    }),
    ...(input.medicalConditions !== undefined && {
      medicalConditions: normalizeList(input.medicalConditions),
    }),
    ...(input.medications !== undefined && {
      medications: normalizeList(input.medications),
    }),
  };
}
