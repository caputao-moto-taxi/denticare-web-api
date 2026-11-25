import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import {
  AppointmentClinicRecord,
  AppointmentDoctorRecord,
  AppointmentPersonRecord,
  AppointmentRecord,
  AppointmentSlotRecord,
  IAppointmentRepository,
} from '../../domain/appointment.repository';
import { CancelAppointmentUseCase } from './cancel-appointment/cancel-appointment-use-case';
import { CreateAppointmentUseCase } from './create-appointment/create-appointment-use-case';
import { ListAppointmentsUseCase } from './list-appointments/list-appointments-use-case';
import { RescheduleAppointmentUseCase } from './reschedule-appointment/reschedule-appointment-use-case';
import { UpdateAppointmentUseCase } from './update-appointment/update-appointment-use-case';
import { GetAppointmentAvailabilityUseCase } from './get-appointment-availability/get-appointment-availability-use-case';

describe('Appointment use cases', () => {
  const staff: AuthUser = {
    id: 'staff-1',
    email: 'staff@example.test',
    role: 'secretary',
    branchId: 'branch-1',
    permissions: ['appointments.read.all', 'appointments.manage'],
  };
  const nextMonday = '2026-03-09';
  const branch: AppointmentClinicRecord = {
    deletedAt: null,
    workingDays: ['SEG'],
    workingHours: { SEG: { start: '08:00', end: '18:00' } },
    timezone: 'Africa/Luanda',
  };
  const patient: AppointmentPersonRecord = {
    id: 'patient-1',
    userId: 'patient-user',
    branchId: 'branch-1',
    deletedAt: null,
    firstName: 'Ana',
    lastName: 'Costa',
    Role: { slug: 'patient' },
  };
  const doctor = (
    id: string,
    profile: AppointmentDoctorRecord['doctorProfile'] = null,
  ): AppointmentDoctorRecord => ({
    id,
    email: `${id}@example.test`,
    branchId: 'branch-1',
    deletedAt: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    Role: { slug: 'doctor' },
    Person: [{ firstName: 'Dr', lastName: id }],
    doctorProfile: profile,
  });
  const appointmentRecord = (
    doctorId: string,
    data: Partial<AppointmentRecord> = {},
  ): AppointmentRecord => ({
    id: 'apt-1',
    date: new Date(`${nextMonday}T00:00:00.000Z`),
    time: new Date(`${nextMonday}T09:00:00.000Z`),
    reason: 'Checkup',
    description: null,
    status: 'CONFIRMED',
    patientId: patient.id,
    doctorId,
    userId: staff.id,
    deletedAt: null,
    patient,
    doctor: doctor(doctorId),
    ...data,
  });
  const repository: jest.Mocked<IAppointmentRepository> = {
    transaction: jest.fn(),
    findBranchSchedule: jest.fn(),
    findPatientById: jest.fn(),
    findPatientByUserId: jest.fn(),
    findDoctorById: jest.fn(),
    findDoctorsByBranch: jest.fn(),
    findAppointmentById: jest.fn(),
    findAppointments: jest.fn(),
    findAppointmentsForDoctorsOnDate: jest.fn(),
    findAppointmentsForDoctorOnDate: jest.fn(),
    lockDoctorForAppointment: jest.fn(),
    createAppointment: jest.fn(),
    updateAppointment: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-02T09:00:00.000Z'));
    repository.findBranchSchedule.mockResolvedValue(branch);
    repository.findPatientById.mockResolvedValue(patient);
    repository.findPatientByUserId.mockResolvedValue(patient);
    repository.findDoctorById.mockResolvedValue(doctor('doctor-1'));
    repository.findDoctorsByBranch.mockResolvedValue([doctor('doctor-1')]);
    repository.findAppointmentsForDoctorsOnDate.mockResolvedValue([]);
    repository.findAppointmentsForDoctorOnDate.mockResolvedValue([]);
    repository.findAppointments.mockResolvedValue({
      appointments: [],
      total: 0,
    });
    repository.transaction.mockImplementation((operation) =>
      operation(repository),
    );
    repository.createAppointment.mockImplementation(async (data) =>
      appointmentRecord(data.doctorId, {
        date: data.date,
        time: data.time,
        reason: data.reason,
        description: data.description ?? null,
        patientId: data.patientId,
        userId: data.userId,
      }),
    );
  });

  afterEach(() => jest.useRealTimers());

  it('validates scheduling policy before creating a selected-doctor appointment', async () => {
    const useCase = new CreateAppointmentUseCase(repository);
    const result = await useCase.execute({
      user: staff,
      input: {
        patientId: patient.id,
        doctorId: 'doctor-1',
        date: nextMonday,
        time: '09:00',
        reason: ' Checkup ',
      },
    });

    expect(result).toMatchObject({
      patientId: patient.id,
      doctorId: 'doctor-1',
      reason: 'Checkup',
      status: 'confirmed',
    });
    expect(repository.lockDoctorForAppointment).toHaveBeenCalledWith(
      'doctor-1',
    );
    expect(repository.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        date: new Date(`${nextMonday}T00:00:00.000Z`),
        time: new Date(`${nextMonday}T09:00:00.000Z`),
        status: 'CONFIRMED',
      }),
    );
  });

  it('rejects a past appointment before looking up its patient', async () => {
    const useCase = new CreateAppointmentUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        input: {
          patientId: patient.id,
          doctorId: 'doctor-1',
          date: '2026-03-02',
          time: '10:00',
          reason: 'Checkup',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findPatientById).not.toHaveBeenCalled();
  });

  it('allocates the least-loaded available doctor when none is selected', async () => {
    repository.findDoctorsByBranch.mockResolvedValue([
      doctor('doctor-1'),
      doctor('doctor-2'),
    ]);
    repository.findAppointmentsForDoctorsOnDate.mockResolvedValue([
      {
        id: 'busy-1',
        doctorId: 'doctor-1',
        time: new Date(`${nextMonday}T15:00:00.000Z`),
        status: 'CONFIRMED',
        deletedAt: null,
      },
    ]);
    const useCase = new CreateAppointmentUseCase(repository);

    const result = await useCase.execute({
      user: staff,
      input: {
        patientId: patient.id,
        date: nextMonday,
        time: '09:00',
        reason: 'Checkup',
      },
    });

    expect(result.doctorId).toBe('doctor-2');
  });

  it('does not count cancelled appointments as occupied slots', async () => {
    repository.findAppointmentsForDoctorOnDate.mockResolvedValue([
      {
        id: 'cancelled-1',
        doctorId: 'doctor-1',
        time: new Date(`${nextMonday}T09:00:00.000Z`),
        status: 'CANCELLED',
        deletedAt: null,
      },
    ]);
    const useCase = new CreateAppointmentUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        input: {
          patientId: patient.id,
          doctorId: 'doctor-1',
          date: nextMonday,
          time: '09:00',
          reason: 'Checkup',
        },
      }),
    ).resolves.toMatchObject({ doctorId: 'doctor-1' });
  });

  it('returns available slots only for the selected doctor', async () => {
    repository.findDoctorsByBranch.mockResolvedValue([
      doctor('doctor-1', {
        specialties: [],
        workingDays: ['SEG'],
        workingHours: { SEG: { start: '09:00', end: '10:30' } },
      }),
      doctor('doctor-2'),
    ]);
    const useCase = new GetAppointmentAvailabilityUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        query: { date: nextMonday, doctorId: 'doctor-1' },
      }),
    ).resolves.toMatchObject({
      doctorId: 'doctor-1',
      closed: false,
      slots: [
        { time: '09:00', doctorIds: ['doctor-1'] },
        { time: '09:30', doctorIds: ['doctor-1'] },
        { time: '10:00', doctorIds: ['doctor-1'] },
      ],
    });
  });

  it('rejects an already occupied slot under the doctor lock', async () => {
    repository.findAppointmentsForDoctorOnDate.mockResolvedValue([
      {
        id: 'busy-1',
        doctorId: 'doctor-1',
        time: new Date(`${nextMonday}T09:00:00.000Z`),
        status: 'CONFIRMED',
        deletedAt: null,
      },
    ]);
    const useCase = new CreateAppointmentUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        input: {
          patientId: patient.id,
          doctorId: 'doctor-1',
          date: nextMonday,
          time: '09:00',
          reason: 'Checkup',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createAppointment).not.toHaveBeenCalled();
  });

  it('updates appointment details in the use case without rechecking an unchanged slot', async () => {
    repository.findAppointmentById.mockResolvedValue(
      appointmentRecord('doctor-1'),
    );
    repository.updateAppointment.mockImplementation(async (id, data) =>
      appointmentRecord(data.doctorId ?? 'doctor-1', {
        ...data,
        id,
      }),
    );
    const useCase = new UpdateAppointmentUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        id: 'apt-1',
        input: {
          patientId: patient.id,
          doctorId: 'doctor-1',
          date: nextMonday,
          time: '09:00',
          reason: '  Consultation  ',
        },
      }),
    ).resolves.toMatchObject({ reason: 'Consultation' });

    expect(repository.findAppointmentsForDoctorOnDate).not.toHaveBeenCalled();
    expect(repository.updateAppointment).toHaveBeenCalledWith(
      'apt-1',
      expect.objectContaining({ reason: 'Consultation' }),
    );
  });

  it('rejects edits to appointments in terminal states before loading related records', async () => {
    repository.findAppointmentById.mockResolvedValue(
      appointmentRecord('doctor-1', { status: 'CANCELLED' }),
    );
    const useCase = new UpdateAppointmentUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        id: 'apt-1',
        input: {
          patientId: patient.id,
          doctorId: 'doctor-1',
          date: nextMonday,
          time: '09:00',
          reason: 'Consultation',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findPatientById).not.toHaveBeenCalled();
  });

  it('reschedules atomically while excluding the current appointment from conflicts', async () => {
    const current = appointmentRecord('doctor-1');
    repository.findAppointmentById.mockResolvedValue(current);
    const booked: AppointmentSlotRecord = {
      id: current.id,
      doctorId: current.doctorId,
      time: current.time,
      status: current.status,
      deletedAt: null,
    };
    repository.findAppointmentsForDoctorOnDate.mockResolvedValue([booked]);
    repository.updateAppointment.mockImplementation(async (id, data) =>
      appointmentRecord('doctor-1', { ...data, id }),
    );
    const useCase = new RescheduleAppointmentUseCase(repository);

    await expect(
      useCase.execute({
        user: staff,
        id: current.id,
        input: { date: nextMonday, time: '10:00' },
      }),
    ).resolves.toMatchObject({ time: '10:00' });

    expect(repository.lockDoctorForAppointment).toHaveBeenCalledWith(
      'doctor-1',
    );
    expect(repository.updateAppointment).toHaveBeenCalledWith(
      current.id,
      expect.objectContaining({ status: 'CONFIRMED' }),
    );
  });

  it('applies list permissions and patient scope in the use case', async () => {
    const user: AuthUser = {
      ...staff,
      id: 'patient-user',
      role: 'patient',
      permissions: [],
    };
    const useCase = new ListAppointmentsUseCase(repository);

    await useCase.execute({
      user,
      query: { status: 'confirmed', patientId: 'patient-1' },
    });

    expect(repository.findAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-1',
        patientScopeId: 'patient-1',
        patientId: 'patient-1',
        status: 'CONFIRMED',
      }),
    );
  });

  it('denies list access to staff without appointment read permissions', async () => {
    const user: AuthUser = { ...staff, permissions: [] };
    const useCase = new ListAppointmentsUseCase(repository);

    await expect(useCase.execute({ user })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findAppointments).not.toHaveBeenCalled();
  });

  it('cancels only active appointments through a focused persistence operation', async () => {
    repository.findAppointmentById.mockResolvedValue(
      appointmentRecord('doctor-1'),
    );
    repository.updateAppointment.mockImplementation(async (id, data) =>
      appointmentRecord('doctor-1', { ...data, id }),
    );
    const useCase = new CancelAppointmentUseCase(repository);

    await expect(
      useCase.execute({ user: staff, id: 'apt-1' }),
    ).resolves.toMatchObject({ status: 'cancelled' });
    expect(repository.updateAppointment).toHaveBeenCalledWith('apt-1', {
      status: 'CANCELLED',
    });
  });
});
