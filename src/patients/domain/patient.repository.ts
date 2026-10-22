import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';

export type PatientCreateCommand = {
  name: string;
  email?: string | null;
  phone?: string;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  address: string;
  medicalNotes?: string;
  idNumber?: string;
  nif?: string;
  profession?: string;
  bloodType?: string | null;
  insuranceProvider?: string;
  insurancePlan?: string;
  insurancePolicyNumber?: string;
  insuranceCoveragePercent?: number | null;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  allergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
};

export type PatientUpdateCommand = Partial<PatientCreateCommand>;

export type PatientStatusCommand = { active: boolean };

export type PatientToothCommand = {
  number: number;
  state: 'healthy' | 'treated' | 'treatment_needed' | 'missing';
  procedureDone?: string;
  notes?: string;
};

export type PatientDiagnosisCommand = {
  code?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'resolved' | 'in_treatment' | 'monitoring';
  affectedTeeth?: number[];
};

export type PatientDiagnosisAttachmentCommand = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type PatientChartPdfData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredDate: string;
  status: string;
  lastVisit: string;
  nextAppointment: string;
  address: string;
  gender: string;
  birthDate: string;
  medicalNotes: string;
  recordNumber: string;
  addressStreet: string;
  idNumber: string;
  nif: string;
  age: number | null;
  bloodType: string;
  profession: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    plan: string;
    policyNumber: string;
    coveragePercent: number;
  };
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  currentTreatment: {
    title: string;
    startedAt: string;
    estimatedCompletion: string;
    progress: number;
    doctorName: string;
    specialty: string;
    activePhase: string;
  };
  metrics: {
    totalAppointments: number;
    completedProcedures: number;
    totalBilled: string;
    totalPaid: string;
    pendingBalance: string;
    paymentCompletionPercent: number;
  };
  appointments: {
    id: string;
    date: string;
    time: string;
    doctorName: string;
    specialty: string;
    procedure: string;
    status: string;
    canComplete?: boolean;
    notes?: string;
    cost: string;
  }[];
  prescriptions: {
    id: string;
    items: {
      medication: string;
      dosage: string;
      instructions: string;
      duration: string;
    }[];
    prescribedBy: string;
    date: string;
    status: string;
  }[];
  diagnoses: {
    id: string;
    code: string;
    title: string;
    affectedTeeth: string[];
    diagnosedAt: string;
    doctorName: string;
    severity: string;
    status: string;
    description: string;
    attachments: {
      id: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }[];
  }[];
  odontogram: {
    number: number;
    state: string;
    procedureDone: string;
    notes: string;
  }[];
  financials: {
    id: string;
    reference: string;
    description: string;
    amount: string;
    method: string;
    date: string;
    status: string;
  }[];
  exams: {
    id: string;
    title: string;
    type: string;
    date: string;
    doctorName: string;
    fileName: string;
    mimeType: string;
    fileSize: string;
  }[];
};

export type PatientPrescriptionPdfData = {
  patient: Pick<
    PatientChartPdfData,
    | 'name'
    | 'recordNumber'
    | 'phone'
    | 'email'
    | 'address'
    | 'birthDate'
    | 'age'
    | 'idNumber'
    | 'nif'
  >;
  prescription: PatientChartPdfData['prescriptions'][number];
};

export type PatientFinancialPdfData = {
  patient: Pick<
    PatientChartPdfData,
    'name' | 'recordNumber' | 'phone' | 'email' | 'address' | 'idNumber' | 'nif'
  >;
  financial: PatientChartPdfData['financials'][number];
};

export type PatientPrescriptionCommand = {
  items: {
    medication: string;
    dosage: string;
    instructions: string;
    duration: string;
  }[];
};

export type PatientFinancialEntryCommand = {
  description: string;
  amount: number;
  method: 'Multicaixa' | 'Transferência' | 'Dinheiro' | 'Convênio';
};

export type PatientExamCommand = {
  title: string;
  type: string;
  doctorName: string;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
};

export abstract class IPatientRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract details(user: AuthUser, id: string): Promise<unknown>;
  abstract getPatientChartPdfData(
    user: AuthUser,
    id: string,
  ): Promise<PatientChartPdfData>;
  abstract getPrescriptionPdfData(
    user: AuthUser,
    id: string,
    prescriptionId: string,
  ): Promise<PatientPrescriptionPdfData>;
  abstract getFinancialPdfData(
    user: AuthUser,
    id: string,
    financialId: string,
  ): Promise<PatientFinancialPdfData>;
  abstract updateTooth(
    user: AuthUser,
    id: string,
    input: PatientToothCommand,
  ): Promise<unknown>;
  abstract addDiagnosis(
    user: AuthUser,
    id: string,
    input: PatientDiagnosisCommand,
  ): Promise<unknown>;
  abstract updateDiagnosis(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    input: PatientDiagnosisCommand,
  ): Promise<unknown>;
  abstract addDiagnosisAttachments(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    files: PatientDiagnosisAttachmentCommand[],
  ): Promise<unknown>;
  abstract getDiagnosisAttachment(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    attachmentId: string,
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }>;
  abstract addPrescription(
    user: AuthUser,
    id: string,
    input: PatientPrescriptionCommand,
  ): Promise<unknown>;
  abstract addFinancialEntry(
    user: AuthUser,
    id: string,
    input: PatientFinancialEntryCommand,
  ): Promise<unknown>;
  abstract addExam(
    user: AuthUser,
    id: string,
    input: PatientExamCommand,
  ): Promise<unknown>;
  abstract getExamFile(
    user: AuthUser,
    id: string,
    examId: string,
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }>;
  abstract create(
    user: AuthUser,
    input: PatientCreateCommand,
  ): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: PatientUpdateCommand,
  ): Promise<unknown>;
  abstract getAvatarStorageKey(
    user: AuthUser,
    id: string,
  ): Promise<string | null>;
  abstract updateAvatarStorageKey(
    user: AuthUser,
    id: string,
    storageKey: string,
  ): Promise<void>;
  abstract setStatus(
    user: AuthUser,
    id: string,
    input: PatientStatusCommand,
  ): Promise<unknown>;
  abstract remove(user: AuthUser, id: string): Promise<unknown>;
}
