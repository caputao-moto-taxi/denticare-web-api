import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AuthUser } from '../../../../auth/auth-user';
import { hasPermission } from '../../../../auth/permissions';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  personSearch,
  validateListFilters,
} from '../../../../shared/helpers/list-filters';
import { joinName } from '../../../../shared/helpers/staff';
import {
  IPatientRepository,
  PatientCreateCommand,
  PatientChartPdfData,
  PatientDiagnosisCommand,
  PatientDiagnosisAttachmentCommand,
  PatientExamCommand,
  PatientFinancialEntryCommand,
  PatientFinancialPdfData,
  PatientPrescriptionCommand,
  PatientPrescriptionPdfData,
  PatientStatusCommand,
  PatientToothCommand,
  PatientUpdateCommand,
} from '../../../domain/patient.repository';
import { PatientExamStorage } from '../../storage/patient-exam-storage';

const STAFF_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
]);

@Injectable()
export class PatientsPrismaRepository implements IPatientRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examStorage: PatientExamStorage,
  ) {}

  async list(user: AuthUser, query: ListQuery = {}) {
    validateListFilters(query, { status: ['active', 'inactive'] });
    const where: Prisma.PersonWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      ...(STAFF_ROLES.has(user.role)
        ? { Role: { slug: 'patient' } }
        : { userId: user.id }),
      ...(query.status && { isActive: query.status === 'active' }),
      createdAt: dateRange(query),
      ...(query.search && {
        OR: [
          personSearch(query.search),
          {
            address: {
              street: { contains: query.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };
    const [patients, total] = await this.prisma.$transaction([
      this.prisma.person.findMany({
        where,
        include: { address: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.person.count({ where }),
    ]);
    return paginated(
      patients.map((patient) =>
        this.toPatient(
          patient,
          this.canReadMedicalNotes(user),
          this.canReadContacts(user),
        ),
      ),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string) {
    const patient = await this.prisma.person.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        ...(STAFF_ROLES.has(user.role) ? {} : { userId: user.id }),
      },
      include: { address: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.toPatient(
      patient,
      this.canReadMedicalNotes(user),
      this.canReadContacts(user),
    );
  }

  async details(user: AuthUser, id: string) {
    const canReadClinical = this.canReadMedicalNotes(user);
    const canReadContacts = this.canReadContacts(user);
    const patient = await this.prisma.person.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        ...(STAFF_ROLES.has(user.role) ? {} : { userId: user.id }),
      },
      include: {
        address: true,
        Appointment: {
          where: {
            deletedAt: null,
            ...(hasPermission(user, 'appointments.read.all') ||
            hasPermission(user, 'appointments.manage')
              ? {}
              : hasPermission(user, 'appointments.read.assigned')
                ? { doctorId: user.id }
                : { id: { in: [] } }),
          },
          include: {
            doctor: {
              include: {
                doctorProfile: true,
                Person: {
                  where: { deletedAt: null },
                  select: { firstName: true, lastName: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: [{ date: 'desc' }, { time: 'desc' }],
        },
        treatmentPlans: {
          where: { branchId: user.branchId, deletedAt: null },
          include: {
            doctor: {
              include: {
                doctorProfile: true,
                Person: {
                  where: { deletedAt: null },
                  select: { firstName: true, lastName: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        },
        diagnostics: {
          where: { deletedAt: null },
          include: {
            doctor: {
              include: {
                Person: {
                  where: { deletedAt: null },
                  select: { firstName: true, lastName: true },
                  take: 1,
                },
              },
            },
            attachments: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        patientPrescriptions: {
          where: { deletedAt: null },
          include: {
            doctor: {
              include: {
                Person: {
                  where: { deletedAt: null },
                  select: { firstName: true, lastName: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        odontogram: { orderBy: { number: 'asc' } },
        exams: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        financialEntries: {
          where: { branchId: user.branchId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        consults: {
          where: { deletedAt: null },
          include: {
            doctor: {
              include: {
                Person: {
                  where: { deletedAt: null },
                  select: { firstName: true, lastName: true },
                  take: 1,
                },
              },
            },
            paidCurrency: true,
            prescriptions: {
              where: { deletedAt: null },
              include: {
                prescriptionItems: {
                  where: { deletedAt: null },
                  include: { product: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const appointments = patient.Appointment.map((appointment) => ({
      id: appointment.id,
      date: appointment.date.toISOString(),
      time: appointment.time.toISOString().slice(11, 16),
      doctorName: joinName(appointment.doctor.Person[0], 'Profissional'),
      specialty: appointment.doctor.doctorProfile?.specialties[0] ?? '',
      procedure: appointment.reason,
      status: this.appointmentStatus(appointment.status),
      canComplete: appointment.status === 'CONFIRMED',
      notes: canReadClinical ? (appointment.description ?? '') : '',
      cost: '—',
    }));
    const financials = [
      ...patient.financialEntries.map((entry) => ({
        id: entry.id,
        reference: entry.reference,
        description: entry.description,
        amount: this.formatMoney(entry.amount),
        amountValue: entry.amount,
        paidValue: entry.status === 'paid' ? entry.amount : 0,
        method: entry.method,
        date: entry.createdAt.toISOString(),
        status: entry.status,
      })),
      ...patient.consults.map((consult) => ({
        id: consult.id,
        reference: `CONS-${consult.id.slice(0, 8).toUpperCase()}`,
        description: consult.description ?? 'Consulta',
        amount: this.formatMoney(consult.paidAmount ?? consult.amount),
        amountValue: consult.amount,
        paidValue: consult.isPaid ? (consult.paidAmount ?? consult.amount) : 0,
        method: '—',
        date: consult.createdAt.toISOString(),
        status: consult.isPaid ? 'paid' : 'pending',
      })),
    ].sort((left, right) => right.date.localeCompare(left.date));
    const totalBilled = financials.reduce(
      (sum, entry) => sum + entry.amountValue,
      0,
    );
    const totalPaid = financials.reduce(
      (sum, entry) => sum + entry.paidValue,
      0,
    );
    const pendingBalance = financials.reduce(
      (sum, entry) => sum + Math.max(0, entry.amountValue - entry.paidValue),
      0,
    );
    const currentTreatment = patient.treatmentPlans.find(
      (plan) => plan.totalSteps === 0 || plan.completedSteps < plan.totalSteps,
    );
    const latestCompletedAppointment = appointments.find(
      (appointment) => appointment.status === 'completed',
    );
    const appointmentDateTime = (appointment: { date: string; time: string }) =>
      new Date(`${appointment.date.slice(0, 10)}T${appointment.time}:00.000Z`);
    const nextAppointment = appointments
      .filter(
        (appointment) =>
          appointment.status === 'scheduled' &&
          appointmentDateTime(appointment).getTime() >= Date.now(),
      )
      .sort(
        (left, right) =>
          appointmentDateTime(left).getTime() -
          appointmentDateTime(right).getTime(),
      )[0];
    const age = patient.birthDate ? this.calculateAge(patient.birthDate) : null;
    const patientPrescriptionGroups = new Map<
      string,
      (typeof patient.patientPrescriptions)[number][]
    >();
    for (const prescription of patient.patientPrescriptions) {
      const groupId = prescription.groupId ?? prescription.id;
      const group = patientPrescriptionGroups.get(groupId) ?? [];
      group.push(prescription);
      patientPrescriptionGroups.set(groupId, group);
    }
    const prescriptions = canReadClinical
      ? [
          ...[...patientPrescriptionGroups.entries()].map(
            ([groupId, items]) => ({
              id: groupId,
              items: items.map((item) => ({
                medication: item.medication,
                dosage: item.dosage,
                instructions: item.instructions,
                duration: item.duration,
              })),
              prescribedBy: joinName(items[0].doctor.Person[0], 'Profissional'),
              date: items[0].createdAt.toISOString(),
              status: items.some((item) => item.status === 'active')
                ? 'active'
                : 'completed',
            }),
          ),
          ...patient.consults.flatMap((consult) =>
            consult.prescriptions.map((prescription) => ({
              id: prescription.id,
              items: prescription.prescriptionItems.map((item) => ({
                medication: item.product.name,
                dosage: item.details ?? '',
                instructions: prescription.recommendations ?? '',
                duration: `${prescription.duration} ${prescription.period.toLowerCase()}`,
              })),
              prescribedBy: joinName(consult.doctor.Person[0], 'Profissional'),
              date: prescription.createdAt.toISOString(),
              status: 'active',
            })),
          ),
        ].sort((left, right) => right.date.localeCompare(left.date))
      : [];

    return {
      ...this.toPatient(patient, canReadClinical, canReadContacts),
      address: canReadContacts
        ? [
            patient.address?.street,
            patient.address?.city,
            patient.address?.province,
            patient.address?.country,
          ]
            .filter(Boolean)
            .join(', ') || ''
        : '',
      addressStreet: canReadContacts ? (patient.address?.street ?? '') : '',
      recordNumber: `#PAC-${patient.createdAt.getFullYear()}-${patient.id
        .slice(0, 8)
        .toUpperCase()}`,
      idNumber: patient.idNumber ?? '',
      nif: patient.nif ?? '',
      age,
      bloodType: canReadClinical ? (patient.bloodType ?? '') : '',
      profession: patient.profession ?? '',
      emergencyContact: {
        name: canReadContacts ? (patient.emergencyContactName ?? '') : '',
        relationship: canReadContacts
          ? (patient.emergencyContactRelationship ?? '')
          : '',
        phone: canReadContacts ? (patient.emergencyContactPhone ?? '') : '',
      },
      insurance: {
        provider: patient.insuranceProvider ?? '',
        plan: patient.insurancePlan ?? '',
        policyNumber: patient.insurancePolicyNumber ?? '',
        coveragePercent: patient.insuranceCoveragePercent ?? 0,
      },
      allergies: canReadClinical ? patient.allergies : [],
      medicalConditions: canReadClinical ? patient.medicalConditions : [],
      medications: canReadClinical ? patient.medications : [],
      currentTreatment: canReadClinical
        ? {
            title: currentTreatment?.diagnosis ?? '',
            startedAt: currentTreatment
              ? currentTreatment.startDate.toISOString()
              : '',
            estimatedCompletion:
              currentTreatment?.estimatedCompletion?.toISOString() ?? '',
            progress: currentTreatment?.totalSteps
              ? Math.min(
                  100,
                  Math.round(
                    (currentTreatment.completedSteps /
                      currentTreatment.totalSteps) *
                      100,
                  ),
                )
              : 0,
            doctorName: currentTreatment
              ? joinName(currentTreatment.doctor.Person[0], 'Profissional')
              : '',
            specialty:
              currentTreatment?.doctor.doctorProfile?.specialties[0] ?? '',
            activePhase:
              currentTreatment?.activePhase ?? currentTreatment?.notes ?? '',
          }
        : {
            title: '',
            startedAt: '',
            estimatedCompletion: '',
            progress: 0,
            doctorName: '',
            specialty: '',
            activePhase: '',
          },
      metrics: {
        totalAppointments: appointments.length,
        completedProcedures: appointments.filter(
          (appointment) => appointment.status === 'completed',
        ).length,
        totalBilled: hasPermission(user, 'patients.financial.read')
          ? this.formatMoney(totalBilled)
          : '',
        totalPaid: hasPermission(user, 'patients.financial.read')
          ? this.formatMoney(totalPaid)
          : '',
        pendingBalance: hasPermission(user, 'patients.financial.read')
          ? this.formatMoney(pendingBalance)
          : '',
        paymentCompletionPercent:
          hasPermission(user, 'patients.financial.read') && totalBilled
            ? Math.min(100, Math.round((totalPaid / totalBilled) * 100))
            : 0,
      },
      lastVisit: latestCompletedAppointment?.date ?? '',
      nextAppointment: nextAppointment
        ? appointmentDateTime(nextAppointment).toISOString()
        : '',
      appointments,
      prescriptions,
      diagnoses: canReadClinical
        ? patient.diagnostics.map((diagnosis) => ({
            id: diagnosis.id,
            code: diagnosis.code ?? '',
            title: diagnosis.designation,
            affectedTeeth: diagnosis.affectedTeeth,
            diagnosedAt: diagnosis.createdAt.toISOString(),
            doctorName: joinName(diagnosis.doctor.Person[0], 'Profissional'),
            severity: diagnosis.severity,
            status: diagnosis.status,
            description: diagnosis.description ?? '',
            attachments: diagnosis.attachments.map((attachment) => ({
              id: attachment.id,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
            })),
          }))
        : [],
      odontogram: canReadClinical
        ? patient.odontogram.map((tooth) => ({
            number: tooth.number,
            state: tooth.state,
            procedureDone: tooth.procedureDone ?? '',
            notes: tooth.notes ?? '',
          }))
        : [],
      financials: hasPermission(user, 'patients.financial.read')
        ? financials.map(
            ({ id, reference, description, amount, method, date, status }) => ({
              id,
              reference,
              description,
              amount,
              method,
              date,
              status,
            }),
          )
        : [],
      exams: canReadClinical
        ? patient.exams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            type: exam.type,
            date: exam.createdAt.toISOString(),
            doctorName: exam.doctorName,
            fileName: exam.fileName,
            mimeType: exam.mimeType,
            fileSize: `${(exam.fileSize / (1024 * 1024)).toFixed(1)} MB`,
          }))
        : [],
    };
  }

  async getPatientChartPdfData(
    user: AuthUser,
    id: string,
  ): Promise<PatientChartPdfData> {
    return this.details(user, id);
  }

  async getPrescriptionPdfData(
    user: AuthUser,
    id: string,
    prescriptionId: string,
  ): Promise<PatientPrescriptionPdfData> {
    const chart = await this.getPatientChartPdfData(user, id);
    const prescription = chart.prescriptions.find(
      (item) => item.id === prescriptionId,
    );
    if (!prescription) {
      throw new NotFoundException('Patient prescription not found');
    }
    return {
      patient: {
        name: chart.name,
        recordNumber: chart.recordNumber,
        phone: chart.phone,
        email: chart.email,
        address: chart.address,
        birthDate: chart.birthDate,
        age: chart.age,
        idNumber: chart.idNumber,
        nif: chart.nif,
      },
      prescription,
    };
  }

  async getFinancialPdfData(
    user: AuthUser,
    id: string,
    financialId: string,
  ): Promise<PatientFinancialPdfData> {
    const chart = await this.details(user, id);
    const financial = chart.financials.find(
      (entry) => entry.id === financialId,
    );
    if (!financial) {
      throw new NotFoundException('Patient financial entry not found');
    }
    return {
      patient: {
        name: chart.name,
        recordNumber: chart.recordNumber,
        phone: chart.phone,
        email: chart.email,
        address: chart.address,
        idNumber: chart.idNumber,
        nif: chart.nif,
      },
      financial,
    };
  }

  async updateTooth(user: AuthUser, id: string, input: PatientToothCommand) {
    this.requireClinicalStaff(user);
    await this.findScopedRecord(user, id);
    return this.prisma.patientTooth.upsert({
      where: {
        patientId_number: { patientId: id, number: input.number },
      },
      create: {
        patientId: id,
        number: input.number,
        state: input.state,
        procedureDone: input.procedureDone?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      update: {
        state: input.state,
        procedureDone: input.procedureDone?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
  }

  async addDiagnosis(
    user: AuthUser,
    id: string,
    input: PatientDiagnosisCommand,
  ) {
    this.requireClinicalStaff(user);
    await this.findScopedRecord(user, id);
    const diagnosis = await this.prisma.diagnostic.create({
      data: {
        patientId: id,
        doctorId: user.id,
        code: input.code?.trim() || null,
        designation: input.title.trim(),
        description: input.description.trim(),
        severity: input.severity,
        status: input.status,
        affectedTeeth: input.affectedTeeth?.map(String) ?? [],
      },
      include: {
        doctor: {
          include: {
            Person: {
              where: { deletedAt: null },
              select: { firstName: true, lastName: true },
              take: 1,
            },
          },
        },
        attachments: true,
      },
    });
    return {
      id: diagnosis.id,
      code: diagnosis.code ?? '',
      title: diagnosis.designation,
      affectedTeeth: diagnosis.affectedTeeth,
      diagnosedAt: diagnosis.createdAt.toISOString(),
      doctorName: joinName(diagnosis.doctor.Person[0], 'Profissional'),
      severity: diagnosis.severity,
      status: diagnosis.status,
      description: diagnosis.description ?? '',
      attachments: diagnosis.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      })),
    };
  }

  async updateDiagnosis(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    input: PatientDiagnosisCommand,
  ) {
    this.requireClinicalStaff(user);
    await this.findScopedRecord(user, id);
    const existing = await this.prisma.diagnostic.findFirst({
      where: { id: diagnosisId, patientId: id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Patient diagnosis not found');
    const diagnosis = await this.prisma.diagnostic.update({
      where: { id: diagnosisId },
      data: {
        code: input.code?.trim() || null,
        designation: input.title.trim(),
        description: input.description.trim(),
        severity: input.severity,
        status: input.status,
        affectedTeeth: input.affectedTeeth?.map(String) ?? [],
      },
      include: {
        doctor: {
          include: {
            Person: {
              where: { deletedAt: null },
              select: { firstName: true, lastName: true },
              take: 1,
            },
          },
        },
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return {
      id: diagnosis.id,
      code: diagnosis.code ?? '',
      title: diagnosis.designation,
      affectedTeeth: diagnosis.affectedTeeth,
      diagnosedAt: diagnosis.createdAt.toISOString(),
      doctorName: joinName(diagnosis.doctor.Person[0], 'Profissional'),
      severity: diagnosis.severity,
      status: diagnosis.status,
      description: diagnosis.description ?? '',
      attachments: diagnosis.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      })),
    };
  }

  async addDiagnosisAttachments(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    files: PatientDiagnosisAttachmentCommand[],
  ) {
    this.requireClinicalStaff(user);
    await this.findScopedRecord(user, id);
    const diagnosis = await this.prisma.diagnostic.findFirst({
      where: { id: diagnosisId, patientId: id, deletedAt: null },
      select: { id: true },
    });
    if (!diagnosis) throw new NotFoundException('Patient diagnosis not found');

    const storageKeys: string[] = [];
    try {
      for (const file of files) {
        const storageKey = randomUUID();
        await this.examStorage.store({
          id: storageKey,
          data: file.buffer,
          mimeType: file.mimetype,
        });
        storageKeys.push(storageKey);
      }

      const attachments = await this.prisma.$transaction(
        files.map((file, index) =>
          this.prisma.diagnosticAttachment.create({
            data: {
              diagnosisId,
              fileName: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              storageKey: storageKeys[index],
            },
          }),
        ),
      );
      return attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      }));
    } catch (error) {
      const cleanupResults = await Promise.allSettled(
        storageKeys.map((storageKey) => this.examStorage.delete(storageKey)),
      );
      const cleanupErrors = cleanupResults
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )
        .map((result) => result.reason);
      if (cleanupErrors.length) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Could not persist diagnosis attachments and clean up stored files',
        );
      }
      throw error;
    }
  }

  async getDiagnosisAttachment(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    attachmentId: string,
  ) {
    this.requireClinicalStaff(user, 'read');
    await this.findScopedRecord(user, id);
    const attachment = await this.prisma.diagnosticAttachment.findFirst({
      where: {
        id: attachmentId,
        diagnosisId,
        deletedAt: null,
        diagnosis: { patientId: id, deletedAt: null },
      },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
    if (!attachment) {
      throw new NotFoundException('Patient diagnosis attachment not found');
    }
    const file = await this.examStorage.get(attachment.storageKey);
    return {
      data: file.data,
      mimeType:
        attachment.mimeType || file.mime_type || 'application/octet-stream',
      fileName: attachment.fileName,
    };
  }

  async addPrescription(
    user: AuthUser,
    id: string,
    input: PatientPrescriptionCommand,
  ) {
    this.requireClinicalStaff(user);
    await this.findScopedRecord(user, id);
    const groupId = randomUUID();
    const prescriptions = await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.patientPrescription.create({
          data: {
            patientId: id,
            doctorId: user.id,
            groupId,
            medication: item.medication.trim(),
            dosage: item.dosage.trim(),
            instructions: item.instructions.trim(),
            duration: item.duration.trim(),
          },
          include: { doctor: true },
        }),
      ),
    );
    const first = prescriptions[0];
    return {
      id: groupId,
      items: prescriptions.map((prescription) => ({
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.instructions,
        duration: prescription.duration,
      })),
      prescribedBy: first.doctor.username,
      date: first.createdAt.toISOString(),
      status: 'active',
    };
  }

  async addFinancialEntry(
    user: AuthUser,
    id: string,
    input: PatientFinancialEntryCommand,
  ) {
    this.requireStaff(user);
    await this.findScopedRecord(user, id);
    const entryId = randomUUID();
    const entry = await this.prisma.patientFinancialEntry.create({
      data: {
        id: entryId,
        patientId: id,
        branchId: user.branchId,
        reference: `REG-${entryId.slice(0, 8).toUpperCase()}`,
        description: input.description.trim(),
        amount: input.amount,
        method: input.method,
      },
    });
    return {
      id: entry.id,
      reference: entry.reference,
      description: entry.description,
      amount: this.formatMoney(entry.amount),
      method: entry.method,
      date: entry.createdAt.toISOString(),
      status: entry.status,
    };
  }

  async addExam(user: AuthUser, id: string, input: PatientExamCommand) {
    this.requireClinicalStaff(user);
    await this.findScopedRecord(user, id);
    const storageKey = randomUUID();
    await this.examStorage.store({
      id: storageKey,
      data: input.file.buffer,
      mimeType: input.file.mimetype,
    });
    try {
      const exam = await this.prisma.patientExam.create({
        data: {
          patientId: id,
          title: input.title.trim(),
          type: input.type,
          doctorName: input.doctorName.trim(),
          fileName: input.file.originalname,
          mimeType: input.file.mimetype,
          fileSize: input.file.size,
          storageKey,
        },
      });
      return {
        id: exam.id,
        title: exam.title,
        type: exam.type,
        date: exam.createdAt.toISOString(),
        doctorName: exam.doctorName,
        fileName: exam.fileName,
        mimeType: exam.mimeType,
        fileSize: `${(exam.fileSize / (1024 * 1024)).toFixed(1)} MB`,
      };
    } catch (error) {
      await this.examStorage.delete(storageKey);
      throw error;
    }
  }

  async getExamFile(user: AuthUser, id: string, examId: string) {
    this.requireClinicalStaff(user, 'read');
    await this.findScopedRecord(user, id);
    const exam = await this.prisma.patientExam.findFirst({
      where: { id: examId, patientId: id, deletedAt: null },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
    if (!exam) throw new NotFoundException('Patient exam not found');
    const file = await this.examStorage.get(exam.storageKey);
    return {
      data: file.data,
      mimeType: exam.mimeType || file.mime_type || 'application/octet-stream',
      fileName: exam.fileName,
    };
  }

  async create(user: AuthUser, input: PatientCreateCommand) {
    this.requireStaff(user);
    const email = input.email?.trim().toLowerCase() || null;
    if (email) {
      const duplicate = await this.prisma.person.findFirst({
        where: { email, deletedAt: null },
        select: { id: true },
      });
      if (duplicate)
        throw new ConflictException('A patient with this email already exists');
    }

    const nameParts = this.splitName(input.name);
    const patient = await this.prisma.$transaction(async (transaction) => {
      const role = await transaction.role.upsert({
        where: { slug: 'patient' },
        create: { name: 'Patient', slug: 'patient', isSystem: true },
        update: {},
      });
      const address = await transaction.address.create({
        data: {
          street: input.address.trim(),
          city: 'Not specified',
          country: 'Angola',
        },
      });
      return transaction.person.create({
        data: {
          ...nameParts,
          email,
          phoneNumber: input.phone?.trim(),
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          gender: input.gender,
          medicalNotes: input.medicalNotes?.trim(),
          idNumber: input.idNumber?.trim(),
          nif: input.nif?.trim(),
          profession: input.profession?.trim(),
          bloodType: input.bloodType,
          insuranceProvider: input.insuranceProvider?.trim(),
          insurancePlan: input.insurancePlan?.trim(),
          insurancePolicyNumber: input.insurancePolicyNumber?.trim(),
          insuranceCoveragePercent: input.insuranceCoveragePercent,
          emergencyContactName: input.emergencyContactName?.trim(),
          emergencyContactRelationship:
            input.emergencyContactRelationship?.trim(),
          emergencyContactPhone: input.emergencyContactPhone?.trim(),
          allergies: input.allergies
            ?.map((value) => value.trim())
            .filter(Boolean),
          medicalConditions: input.medicalConditions
            ?.map((value) => value.trim())
            .filter(Boolean),
          medications: input.medications
            ?.map((value) => value.trim())
            .filter(Boolean),
          branchId: user.branchId,
          addressId: address.id,
          roleId: role.id,
        },
        include: { address: true },
      });
    });

    return this.toPatient(
      patient,
      this.canReadMedicalNotes(user),
      this.canReadContacts(user),
    );
  }

  async update(user: AuthUser, id: string, input: PatientUpdateCommand) {
    const existing = await this.findScopedRecord(user, id);
    if (!STAFF_ROLES.has(user.role) && existing.userId !== user.id) {
      throw new ForbiddenException('You cannot update this patient record');
    }

    const email = input.email?.trim().toLowerCase() || null;
    if (email && email !== existing.email) {
      const duplicate = await this.prisma.person.findFirst({
        where: { email, deletedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (duplicate)
        throw new ConflictException('A patient with this email already exists');
    }

    const nameParts = input.name ? this.splitName(input.name) : undefined;
    const updated = await this.prisma.$transaction(async (transaction) => {
      if (input.address !== undefined) {
        await transaction.address.update({
          where: { id: existing.addressId },
          data: { street: input.address.trim() },
        });
      }
      return transaction.person.update({
        where: { id },
        data: {
          ...nameParts,
          ...(input.email !== undefined && { email }),
          ...(input.phone !== undefined && { phoneNumber: input.phone.trim() }),
          ...(input.birthDate !== undefined && {
            birthDate: input.birthDate ? new Date(input.birthDate) : null,
          }),
          ...(input.gender !== undefined && { gender: input.gender }),
          ...(input.medicalNotes !== undefined && {
            medicalNotes: input.medicalNotes.trim(),
          }),
          ...(input.idNumber !== undefined && {
            idNumber: input.idNumber.trim(),
          }),
          ...(input.nif !== undefined && { nif: input.nif.trim() }),
          ...(input.profession !== undefined && {
            profession: input.profession.trim(),
          }),
          ...(input.bloodType !== undefined && {
            bloodType: input.bloodType,
          }),
          ...(input.insuranceProvider !== undefined && {
            insuranceProvider: input.insuranceProvider.trim(),
          }),
          ...(input.insurancePlan !== undefined && {
            insurancePlan: input.insurancePlan.trim(),
          }),
          ...(input.insurancePolicyNumber !== undefined && {
            insurancePolicyNumber: input.insurancePolicyNumber.trim(),
          }),
          ...(input.insuranceCoveragePercent !== undefined && {
            insuranceCoveragePercent: input.insuranceCoveragePercent,
          }),
          ...(input.emergencyContactName !== undefined && {
            emergencyContactName: input.emergencyContactName.trim(),
          }),
          ...(input.emergencyContactRelationship !== undefined && {
            emergencyContactRelationship:
              input.emergencyContactRelationship.trim(),
          }),
          ...(input.emergencyContactPhone !== undefined && {
            emergencyContactPhone: input.emergencyContactPhone.trim(),
          }),
          ...(input.allergies !== undefined && {
            allergies: input.allergies
              .map((value) => value.trim())
              .filter(Boolean),
          }),
          ...(input.medicalConditions !== undefined && {
            medicalConditions: input.medicalConditions
              .map((value) => value.trim())
              .filter(Boolean),
          }),
          ...(input.medications !== undefined && {
            medications: input.medications
              .map((value) => value.trim())
              .filter(Boolean),
          }),
        },
        include: { address: true },
      });
    });

    return this.toPatient(
      updated,
      this.canReadMedicalNotes(user),
      this.canReadContacts(user),
    );
  }

  async getAvatarStorageKey(user: AuthUser, id: string) {
    const patient = await this.findScopedRecord(user, id);
    return patient.avatar;
  }

  async updateAvatarStorageKey(user: AuthUser, id: string, storageKey: string) {
    await this.findScopedRecord(user, id);
    await this.prisma.person.update({
      where: { id },
      data: { avatar: storageKey },
    });
  }

  async setStatus(user: AuthUser, id: string, input: PatientStatusCommand) {
    this.requireStaff(user);
    await this.findScopedRecord(user, id);
    const patient = await this.prisma.person.update({
      where: { id },
      data: { isActive: input.active },
      include: { address: true },
    });
    return this.toPatient(
      patient,
      this.canReadMedicalNotes(user),
      this.canReadContacts(user),
    );
  }

  async remove(user: AuthUser, id: string) {
    this.requireStaff(user);
    await this.findScopedRecord(user, id);
    await this.prisma.person.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { id, deleted: true };
  }

  private async findScopedRecord(user: AuthUser, id: string) {
    const patient = await this.prisma.person.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        ...(STAFF_ROLES.has(user.role) ? {} : { userId: user.id }),
      },
      include: { address: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  private requireStaff(user: AuthUser) {
    if (!STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException('Clinic staff access is required');
    }
  }

  private requireClinicalStaff(
    user: AuthUser,
    access: 'read' | 'write' = 'write',
  ) {
    const permission =
      access === 'read' ? 'patients.clinical.read' : 'patients.clinical.write';
    if (!hasPermission(user, permission)) {
      throw new ForbiddenException('Clinical permissions are required');
    }
  }

  private canReadMedicalNotes(user: AuthUser) {
    return hasPermission(user, 'patients.clinical.read');
  }

  private canReadContacts(user: AuthUser) {
    return hasPermission(user, 'patients.contacts.read');
  }

  private appointmentStatus(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'completed';
      case 'PENDING':
      case 'CONFIRMED':
      case 'RESCHEDULED':
        return 'scheduled';
      default:
        return 'cancelled';
    }
  }

  private formatMoney(amount: number) {
    return `${amount.toLocaleString('pt-PT', {
      maximumFractionDigits: 2,
    })} Kz`;
  }

  private calculateAge(birthDate: Date) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  private splitName(name: string) {
    const [firstName, ...lastParts] = name
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ');
    return { firstName, lastName: lastParts.join(' ') || firstName };
  }

  private toPatient(
    patient: {
      id: string;
      avatar?: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      phoneNumber: string | null;
      birthDate: Date | null;
      gender: string;
      medicalNotes: string | null;
      isActive: boolean;
      createdAt: Date;
      address: { street: string } | null;
    },
    includeMedicalNotes: boolean,
    includeContacts: boolean,
  ) {
    return {
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`.trim(),
      email: includeContacts ? (patient.email ?? '') : '',
      phone: includeContacts ? (patient.phoneNumber ?? '') : '',
      registeredDate: patient.createdAt.toISOString(),
      status: patient.isActive ? 'active' : 'inactive',
      address: includeContacts ? (patient.address?.street ?? '') : '',
      gender: patient.gender.toLowerCase(),
      birthDate: patient.birthDate?.toISOString() ?? '',
      medicalNotes: includeMedicalNotes ? (patient.medicalNotes ?? '') : '',
      avatar: patient.avatar ? `/patients/${patient.id}/avatar` : '',
    };
  }
}
