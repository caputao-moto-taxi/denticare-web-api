import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AuthUser } from '../../../../auth/auth-user';
import {
  canAccessClinicPatientRecords,
  canReadPatientClinicalData,
  canReadPatientContacts,
  canReadPatientFinancials,
  patientAppointmentVisibility,
} from '../../../application/patient-access.policy';
import {
  calculatePatientAge,
  currentPatientTreatment,
  formatPatientMoney,
  groupPatientPrescriptions,
  nextPatientAppointment,
  patientAppointmentDateTime,
  patientAppointmentStatus,
  patientFinancials,
  patientFinancialTotals,
  patientPaymentCompletionPercent,
  patientTreatmentProgress,
} from '../../../application/patient-details.rules';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  personSearch,
} from '../../../../shared/helpers/list-filters';
import { joinName } from '../../../../shared/helpers/staff';
import {
  IPatientRepository,
  PatientCreatePersistenceCommand,
  PatientChartPdfData,
  PatientDiagnosisPersistenceCommand,
  PatientDiagnosisAttachmentPersistenceCommand,
  PatientExamPersistenceCommand,
  PatientFinancialEntryCommand,
  PatientPrescriptionCommand,
  PatientStatusCommand,
  PatientToothPersistenceCommand,
  PatientUpdatePersistenceCommand,
} from '../../../domain/patient.repository';

@Injectable()
export class PatientsPrismaRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuery = {}) {
    const where: Prisma.PersonWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      ...(canAccessClinicPatientRecords(user)
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
          canReadPatientClinicalData(user),
          canReadPatientContacts(user),
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
        ...(canAccessClinicPatientRecords(user) ? {} : { userId: user.id }),
      },
      include: { address: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.toPatient(
      patient,
      canReadPatientClinicalData(user),
      canReadPatientContacts(user),
    );
  }

  async details(user: AuthUser, id: string) {
    const canReadClinical = canReadPatientClinicalData(user);
    const canReadContacts = canReadPatientContacts(user);
    const patient = await this.prisma.person.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        ...(canAccessClinicPatientRecords(user) ? {} : { userId: user.id }),
      },
      include: {
        address: true,
        Appointment: {
          where: {
            deletedAt: null,
            ...patientAppointmentVisibility(user),
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
      status: patientAppointmentStatus(appointment.status),
      canComplete: appointment.status === 'CONFIRMED',
      notes: canReadClinical ? (appointment.description ?? '') : '',
      cost: '—',
    }));
    const financials = patientFinancials(
      patient.financialEntries,
      patient.consults,
    );
    const {
      billed: totalBilled,
      paid: totalPaid,
      pending: pendingBalance,
    } = patientFinancialTotals(financials);
    const currentTreatment = currentPatientTreatment(patient.treatmentPlans);
    const latestCompletedAppointment = appointments.find(
      (appointment) => appointment.status === 'completed',
    );
    const nextAppointment = nextPatientAppointment(appointments);
    const age = patient.birthDate
      ? calculatePatientAge(patient.birthDate)
      : null;
    const patientPrescriptionGroups = groupPatientPrescriptions(
      patient.patientPrescriptions,
    );
    const prescriptions = canReadClinical
      ? [
          ...patientPrescriptionGroups.map(([groupId, items]) => ({
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
          })),
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
            progress: patientTreatmentProgress(
              currentTreatment?.completedSteps ?? 0,
              currentTreatment?.totalSteps ?? 0,
            ),
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
        totalBilled: canReadPatientFinancials(user)
          ? formatPatientMoney(totalBilled)
          : '',
        totalPaid: canReadPatientFinancials(user)
          ? formatPatientMoney(totalPaid)
          : '',
        pendingBalance: canReadPatientFinancials(user)
          ? formatPatientMoney(pendingBalance)
          : '',
        paymentCompletionPercent: canReadPatientFinancials(user)
          ? patientPaymentCompletionPercent(totalPaid, totalBilled)
          : 0,
      },
      lastVisit: latestCompletedAppointment?.date ?? '',
      nextAppointment: nextAppointment
        ? patientAppointmentDateTime(nextAppointment).toISOString()
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
      financials: canReadPatientFinancials(user)
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

  async updateTooth(
    user: AuthUser,
    id: string,
    input: PatientToothPersistenceCommand,
  ) {
    await this.findScopedRecord(user, id);
    return this.prisma.patientTooth.upsert({
      where: {
        patientId_number: { patientId: id, number: input.number },
      },
      create: {
        patientId: id,
        number: input.number,
        state: input.state,
        procedureDone: input.procedureDone,
        notes: input.notes,
      },
      update: {
        state: input.state,
        procedureDone: input.procedureDone,
        notes: input.notes,
      },
    });
  }

  async addDiagnosis(
    user: AuthUser,
    id: string,
    input: PatientDiagnosisPersistenceCommand,
  ) {
    await this.findScopedRecord(user, id);
    const diagnosis = await this.prisma.diagnostic.create({
      data: {
        patientId: id,
        doctorId: user.id,
        code: input.code || null,
        designation: input.designation,
        description: input.description,
        severity: input.severity,
        status: input.status,
        affectedTeeth: input.affectedTeeth,
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
    return diagnosis;
  }

  async updateDiagnosis(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    input: PatientDiagnosisPersistenceCommand,
  ) {
    await this.findScopedRecord(user, id);
    const existing = await this.prisma.diagnostic.findFirst({
      where: { id: diagnosisId, patientId: id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Patient diagnosis not found');
    const diagnosis = await this.prisma.diagnostic.update({
      where: { id: diagnosisId },
      data: {
        code: input.code || null,
        designation: input.designation,
        description: input.description,
        severity: input.severity,
        status: input.status,
        affectedTeeth: input.affectedTeeth,
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
    return diagnosis;
  }

  async addDiagnosisAttachments(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    files: PatientDiagnosisAttachmentPersistenceCommand[],
  ) {
    await this.findScopedRecord(user, id);
    const diagnosis = await this.prisma.diagnostic.findFirst({
      where: { id: diagnosisId, patientId: id, deletedAt: null },
      select: { id: true },
    });
    if (!diagnosis) throw new NotFoundException('Patient diagnosis not found');

    return this.prisma.$transaction(
      files.map((file) =>
        this.prisma.diagnosticAttachment.create({
          data: {
            diagnosisId,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            storageKey: file.storageKey,
          },
        }),
      ),
    );
  }

  async getDiagnosisAttachment(
    user: AuthUser,
    id: string,
    diagnosisId: string,
    attachmentId: string,
  ) {
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
    return attachment;
  }

  async addPrescription(
    user: AuthUser,
    id: string,
    input: PatientPrescriptionCommand,
    groupId: string,
  ) {
    await this.findScopedRecord(user, id);
    return this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.patientPrescription.create({
          data: {
            patientId: id,
            doctorId: user.id,
            groupId,
            medication: item.medication,
            dosage: item.dosage,
            instructions: item.instructions,
            duration: item.duration,
          },
          include: { doctor: true },
        }),
      ),
    );
  }

  async addFinancialEntry(
    user: AuthUser,
    id: string,
    input: PatientFinancialEntryCommand,
    entryId: string,
    reference: string,
  ) {
    await this.findScopedRecord(user, id);
    return this.prisma.patientFinancialEntry.create({
      data: {
        id: entryId,
        patientId: id,
        branchId: user.branchId,
        reference,
        description: input.description,
        amount: input.amount,
        method: input.method,
      },
    });
  }

  async addExam(
    user: AuthUser,
    id: string,
    input: PatientExamPersistenceCommand,
  ) {
    await this.findScopedRecord(user, id);
    return this.prisma.patientExam.create({
      data: { patientId: id, ...input },
    });
  }

  async getExamFile(user: AuthUser, id: string, examId: string) {
    await this.findScopedRecord(user, id);
    const exam = await this.prisma.patientExam.findFirst({
      where: { id: examId, patientId: id, deletedAt: null },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
    if (!exam) throw new NotFoundException('Patient exam not found');
    return exam;
  }

  async emailExists(email: string, excludingId?: string) {
    const existing = await this.prisma.person.findFirst({
      where: {
        email,
        deletedAt: null,
        ...(excludingId && { id: { not: excludingId } }),
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async getConsentState(user: AuthUser, id: string) {
    const patient = await this.prisma.person.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        ...(canAccessClinicPatientRecords(user) ? {} : { userId: user.id }),
      },
      select: {
        dataProcessingConsent: true,
        dataProcessingConsentUpdatedAt: true,
        marketingEmailConsent: true,
        marketingEmailConsentUpdatedAt: true,
        marketingSmsConsent: true,
        marketingSmsConsentUpdatedAt: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async create(user: AuthUser, input: PatientCreatePersistenceCommand) {
    const patient = await this.prisma.$transaction(async (transaction) => {
      const role = await transaction.role.upsert({
        where: { slug: 'patient' },
        create: { name: 'Patient', slug: 'patient', isSystem: true },
        update: {},
      });
      const address = await transaction.address.create({
        data: {
          street: input.address,
          city: 'Not specified',
          country: 'Angola',
        },
      });
      return transaction.person.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phoneNumber: input.phone,
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          gender: input.gender,
          medicalNotes: input.medicalNotes,
          dataProcessingConsent: input.dataProcessingConsent ?? false,
          dataProcessingConsentUpdatedAt: input.dataProcessingConsentUpdatedAt,
          idNumber: input.idNumber,
          nif: input.nif,
          profession: input.profession,
          bloodType: input.bloodType,
          insuranceProvider: input.insuranceProvider,
          insurancePlan: input.insurancePlan,
          insurancePolicyNumber: input.insurancePolicyNumber,
          insuranceCoveragePercent: input.insuranceCoveragePercent,
          emergencyContactName: input.emergencyContactName,
          emergencyContactRelationship: input.emergencyContactRelationship,
          emergencyContactPhone: input.emergencyContactPhone,
          allergies: input.allergies,
          medicalConditions: input.medicalConditions,
          medications: input.medications,
          branchId: user.branchId,
          addressId: address.id,
          roleId: role.id,
        },
        include: { address: true },
      });
    });

    return this.toPatient(
      patient,
      canReadPatientClinicalData(user),
      canReadPatientContacts(user),
    );
  }

  async update(
    user: AuthUser,
    id: string,
    input: PatientUpdatePersistenceCommand,
  ) {
    const existing = await this.findScopedRecord(user, id);
    const updated = await this.prisma.$transaction(async (transaction) => {
      if (input.address !== undefined) {
        await transaction.address.update({
          where: { id: existing.addressId },
          data: { street: input.address },
        });
      }
      return transaction.person.update({
        where: { id },
        data: {
          ...(input.firstName !== undefined && {
            firstName: input.firstName,
          }),
          ...(input.lastName !== undefined && { lastName: input.lastName }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.phone !== undefined && { phoneNumber: input.phone }),
          ...(input.birthDate !== undefined && {
            birthDate: input.birthDate ? new Date(input.birthDate) : null,
          }),
          ...(input.gender !== undefined && { gender: input.gender }),
          ...(input.medicalNotes !== undefined && {
            medicalNotes: input.medicalNotes,
          }),
          ...(input.dataProcessingConsent !== undefined && {
            dataProcessingConsent: input.dataProcessingConsent,
            dataProcessingConsentUpdatedAt:
              input.dataProcessingConsentUpdatedAt,
          }),
          ...(input.marketingEmailConsent !== undefined && {
            marketingEmailConsent: input.marketingEmailConsent,
            marketingEmailConsentUpdatedAt:
              input.marketingEmailConsentUpdatedAt,
          }),
          ...(input.marketingSmsConsent !== undefined && {
            marketingSmsConsent: input.marketingSmsConsent,
            marketingSmsConsentUpdatedAt: input.marketingSmsConsentUpdatedAt,
          }),
          ...(input.idNumber !== undefined && {
            idNumber: input.idNumber,
          }),
          ...(input.nif !== undefined && { nif: input.nif }),
          ...(input.profession !== undefined && {
            profession: input.profession,
          }),
          ...(input.bloodType !== undefined && {
            bloodType: input.bloodType,
          }),
          ...(input.insuranceProvider !== undefined && {
            insuranceProvider: input.insuranceProvider,
          }),
          ...(input.insurancePlan !== undefined && {
            insurancePlan: input.insurancePlan,
          }),
          ...(input.insurancePolicyNumber !== undefined && {
            insurancePolicyNumber: input.insurancePolicyNumber,
          }),
          ...(input.insuranceCoveragePercent !== undefined && {
            insuranceCoveragePercent: input.insuranceCoveragePercent,
          }),
          ...(input.emergencyContactName !== undefined && {
            emergencyContactName: input.emergencyContactName,
          }),
          ...(input.emergencyContactRelationship !== undefined && {
            emergencyContactRelationship: input.emergencyContactRelationship,
          }),
          ...(input.emergencyContactPhone !== undefined && {
            emergencyContactPhone: input.emergencyContactPhone,
          }),
          ...(input.allergies !== undefined && {
            allergies: input.allergies,
          }),
          ...(input.medicalConditions !== undefined && {
            medicalConditions: input.medicalConditions,
          }),
          ...(input.medications !== undefined && {
            medications: input.medications,
          }),
        },
        include: { address: true },
      });
    });

    return this.toPatient(
      updated,
      canReadPatientClinicalData(user),
      canReadPatientContacts(user),
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
    await this.findScopedRecord(user, id);
    const patient = await this.prisma.person.update({
      where: { id },
      data: { isActive: input.active },
      include: { address: true },
    });
    return this.toPatient(
      patient,
      canReadPatientClinicalData(user),
      canReadPatientContacts(user),
    );
  }

  async remove(user: AuthUser, id: string) {
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
        ...(canAccessClinicPatientRecords(user) ? {} : { userId: user.id }),
      },
      include: { address: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
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
      dataProcessingConsent: boolean;
      dataProcessingConsentUpdatedAt: Date | null;
      marketingEmailConsent: boolean;
      marketingEmailConsentUpdatedAt: Date | null;
      marketingSmsConsent: boolean;
      marketingSmsConsentUpdatedAt: Date | null;
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
      dataProcessingConsent: patient.dataProcessingConsent,
      dataProcessingConsentUpdatedAt:
        patient.dataProcessingConsentUpdatedAt?.toISOString() ?? null,
      marketingEmailConsent: patient.marketingEmailConsent,
      marketingEmailConsentUpdatedAt:
        patient.marketingEmailConsentUpdatedAt?.toISOString() ?? null,
      marketingSmsConsent: patient.marketingSmsConsent,
      marketingSmsConsentUpdatedAt:
        patient.marketingSmsConsentUpdatedAt?.toISOString() ?? null,
      avatar: patient.avatar ? `/patients/${patient.id}/avatar` : '',
    };
  }
}
