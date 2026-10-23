import { AuthUser } from '../../auth/auth-user';
import {
  Appointment,
  AppointmentId,
  AppointmentStatus,
  AppointmentView,
  IAppointmentClinicRepository,
  IAppointmentDoctorRepository,
  IAppointmentPatientRepository,
  IAppointmentRepository,
} from '../domain';
import { AppointmentSchedulingService } from './common/appointment-scheduling.service';
import {
  CancelAppointmentUseCase,
  CompleteAppointmentUseCase,
  CreateAppointmentUseCase,
  GetAppointmentAvailabilityUseCase,
  GetAppointmentUseCase,
  ListAppointmentsUseCase,
  RescheduleAppointmentUseCase,
  UpdateAppointmentUseCase,
} from './useCases';

describe('Appointment use cases', () => {
  const staff: AuthUser = {
    id: 'staff-1',
    email: 'staff@example.test',
    role: 'secretary',
    branchId: 'branch-1',
    permissions: [
      'appointments.read.all',
      'appointments.create',
      'appointments.manage',
    ],
  };
  // Monday, 10:00 in the clinic (Africa/Luanda is UTC+1).
  const NOW = new Date('2026-03-02T09:00:00.000Z');
  const NEXT_MONDAY = '2026-03-09';
  const APPOINTMENT_ID = '3f2b8c1e-7d3a-4a52-9d57-0c1f0a6b9e11';

  const at = (time: string) => new Date(`${NEXT_MONDAY}T${time}:00.000Z`);
  const monday = new Date(`${NEXT_MONDAY}T00:00:00.000Z`);

  let saved: Appointment | undefined;
  const appointments = {
    insert: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findViewById: jest.fn(),
    listPaginated: jest.fn(),
    findBookedSlots: jest.fn(),
    runWithDoctorLock: jest.fn(),
  } as jest.Mocked<IAppointmentRepository>;
  const clinics = {
    findByBranchId: jest.fn(),
  } as jest.Mocked<IAppointmentClinicRepository>;
  const patients = {
    findOne: jest.fn(),
  } as jest.Mocked<IAppointmentPatientRepository>;
  const doctors = {
    findActive: jest.fn(),
    findProfile: jest.fn(),
  } as jest.Mocked<IAppointmentDoctorRepository>;
  const scheduling = new AppointmentSchedulingService(clinics, appointments);

  const create = new CreateAppointmentUseCase(
    appointments,
    patients,
    doctors,
    scheduling,
  );
  const update = new UpdateAppointmentUseCase(
    appointments,
    patients,
    doctors,
    scheduling,
  );
  const reschedule = new RescheduleAppointmentUseCase(
    appointments,
    doctors,
    scheduling,
  );
  const cancel = new CancelAppointmentUseCase(appointments);
  const complete = new CompleteAppointmentUseCase(appointments);
  const get = new GetAppointmentUseCase(appointments);
  const availability = new GetAppointmentAvailabilityUseCase(
    appointments,
    doctors,
    scheduling,
  );
  const list = new ListAppointmentsUseCase(appointments, patients);

  const doctor = (id: string, profile: unknown = null) => ({
    id,
    profile: profile as { workingDays: string[]; workingHours: unknown } | null,
  });
  const existing = (status: AppointmentStatus = 'CONFIRMED', doctorId = 'd1') =>
    new Appointment({
      id: new AppointmentId(APPOINTMENT_ID),
      patientId: 'patient-1',
      doctorId,
      date: monday,
      time: at('09:00'),
      reason: 'Checkup',
      status,
    });
  const viewOf = (appointment: Appointment): AppointmentView => ({
    id: appointment.id.value,
    date: appointment.date,
    time: appointment.time,
    reason: appointment.reason,
    description: appointment.description ?? null,
    status: appointment.status,
    patient: { id: appointment.patientId, firstName: 'Ana', lastName: 'Costa' },
    doctor: {
      id: appointment.doctorId,
      email: `${appointment.doctorId}@example.test`,
      firstName: 'Dr',
      lastName: appointment.doctorId,
    },
  });
  const request = {
    patientId: 'patient-1',
    date: NEXT_MONDAY,
    time: '09:00',
    reason: 'Checkup',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    saved = undefined;
    // No configured hours, so the default clinic schedule applies.
    clinics.findByBranchId.mockResolvedValue({
      workingDays: [],
      workingHours: null,
      timezone: 'Africa/Luanda',
    });
    patients.findOne.mockResolvedValue({ id: 'patient-1' });
    doctors.findProfile.mockResolvedValue(null);
    appointments.findBookedSlots.mockResolvedValue([]);
    appointments.runWithDoctorLock.mockImplementation((_, action) =>
      action(appointments),
    );
    appointments.insert.mockImplementation(async (appointment) => {
      saved = appointment;
    });
    appointments.update.mockImplementation(async (appointment) => {
      saved = appointment;
    });
    appointments.findViewById.mockImplementation(async () =>
      saved ? viewOf(saved) : null,
    );
  });

  afterEach(() => jest.useRealTimers());

  describe('create', () => {
    it('refuses dates that already passed in the clinic time zone', async () => {
      // 09:30 UTC is 10:30 in Luanda, so 10:00 today is already over.
      jest.setSystemTime(new Date('2026-03-02T09:30:00.000Z'));

      const result = await create.execute({
        user: staff,
        input: {
          ...request,
          date: '2026-03-02',
          time: '10:00',
          doctorId: 'd1',
        },
      });

      expect(result.status).toBe(400);
      expect(patients.findOne).not.toHaveBeenCalled();
    });

    it('refuses times when the clinic is closed', async () => {
      const sunday = await create.execute({
        user: staff,
        input: { ...request, date: '2026-03-08', doctorId: 'd1' },
      });
      const lunch = await create.execute({
        user: staff,
        input: { ...request, time: '13:00', doctorId: 'd1' },
      });

      for (const result of [sunday, lunch]) {
        expect(result.status).toBe(409);
        expect(result.data).toMatchObject({
          message: 'The clinic is closed at this time',
        });
      }
    });

    it('refuses a doctor outside their own schedule', async () => {
      doctors.findActive.mockResolvedValue([
        doctor('d1', {
          workingDays: ['TER'],
          workingHours: { TER: { start: '09:00', end: '12:00' } },
        }),
      ]);

      const result = await create.execute({
        user: staff,
        input: { ...request, doctorId: 'd1' },
      });

      expect(result.status).toBe(409);
      expect(result.data).toMatchObject({
        message: 'Doctor is not available for this time slot',
      });
    });

    it('books the chosen doctor when they are free', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);

      const result = await create.execute({
        user: staff,
        input: { ...request, doctorId: 'd1' },
      });

      expect(result.status).toBe(201);
      expect(result.data).toMatchObject({
        doctorId: 'd1',
        status: 'confirmed',
        date: NEXT_MONDAY,
        time: '09:00',
      });
      expect(appointments.runWithDoctorLock).toHaveBeenCalledWith(
        'd1',
        expect.any(Function),
      );
      expect(saved).toMatchObject({ createdById: 'staff-1' });
    });

    it('allocates the least busy free doctor when none is chosen', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1'), doctor('d2')]);
      // d1 already has an appointment earlier that day, d2 has none.
      appointments.findBookedSlots.mockResolvedValueOnce([
        { doctorId: 'd1', time: at('15:00') },
      ]);

      await create.execute({ user: staff, input: request });

      expect(appointments.insert).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'd2' }),
      );
    });

    it('skips doctors who are busy at that time', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1'), doctor('d2')]);
      appointments.findBookedSlots.mockResolvedValueOnce([
        { doctorId: 'd2', time: at('09:00') },
      ]);

      await create.execute({ user: staff, input: request });

      expect(appointments.insert).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'd1' }),
      );
    });

    it('falls back to the next doctor when the first one is taken meanwhile', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1'), doctor('d2')]);
      appointments.findBookedSlots
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ doctorId: 'd1', time: at('09:00') }])
        .mockResolvedValueOnce([]);

      const result = await create.execute({ user: staff, input: request });

      expect(result.status).toBe(201);
      expect(appointments.insert).toHaveBeenCalledTimes(1);
      expect(appointments.insert).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'd2' }),
      );
    });

    it('fails when no doctor can take the slot', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);
      appointments.findBookedSlots.mockResolvedValue([
        { doctorId: 'd1', time: at('09:00') },
      ]);

      const result = await create.execute({ user: staff, input: request });

      expect(result.status).toBe(409);
      expect(result.data).toMatchObject({
        message: 'No doctor is available for this time slot',
      });
      expect(appointments.insert).not.toHaveBeenCalled();
    });

    it('keeps conflict semantics for slots taken by another booking', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);
      appointments.findBookedSlots.mockResolvedValue([
        { doctorId: 'd1', time: at('09:00') },
      ]);

      const result = await create.execute({
        user: staff,
        input: { ...request, doctorId: 'd1' },
      });

      expect(result.status).toBe(409);
      expect(appointments.insert).not.toHaveBeenCalled();
    });

    it('requires the patient to belong to the clinic', async () => {
      patients.findOne.mockResolvedValue(null);

      const result = await create.execute({
        user: staff,
        input: { ...request, doctorId: 'd1' },
      });

      expect(result.status).toBe(404);
    });

    it('books patients for their own record only', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);

      await create.execute({
        user: { ...staff, id: 'user-9', role: 'patient' },
        input: { ...request, patientId: 'someone-else', doctorId: 'd1' },
      });

      expect(patients.findOne).toHaveBeenCalledWith({
        branchId: 'branch-1',
        userId: 'user-9',
      });
    });

    it('rejects roles that are neither staff nor patient', async () => {
      const result = await create.execute({
        user: { ...staff, role: 'guest' },
        input: request,
      });

      expect(result.status).toBe(403);
    });

    it('rejects invalid appointment data before saving', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);

      const result = await create.execute({
        user: staff,
        input: { ...request, doctorId: 'd1', reason: 'a'.repeat(301) },
      });

      expect(result.status).toBe(400);
      expect(appointments.insert).not.toHaveBeenCalled();
    });

    it('does not hide unexpected failures as client errors', async () => {
      clinics.findByBranchId.mockRejectedValue(new Error('database is down'));

      await expect(
        create.execute({ user: staff, input: request }),
      ).rejects.toThrow('database is down');
    });
  });

  describe('availability', () => {
    it('returns the free slots of the selected doctor only', async () => {
      doctors.findActive.mockResolvedValue([
        doctor('d1', {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:00', end: '10:30' } },
        }),
      ]);

      const result = await availability.execute({
        user: staff,
        query: { date: NEXT_MONDAY, doctorId: 'd1' },
      });

      expect(doctors.findActive).toHaveBeenCalledWith('branch-1', 'd1');
      expect(result.data).toMatchObject({
        closed: false,
        slotDurationMinutes: 30,
        slots: [
          { time: '09:00', doctorIds: ['d1'] },
          { time: '09:30', doctorIds: ['d1'] },
          { time: '10:00', doctorIds: ['d1'] },
        ],
      });
    });

    it('merges every doctor when none is selected', async () => {
      doctors.findActive.mockResolvedValue([
        doctor('d1', {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:00', end: '10:00' } },
        }),
        doctor('d2', {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:30', end: '11:00' } },
        }),
      ]);

      const result = await availability.execute({
        user: staff,
        query: { date: NEXT_MONDAY },
      });

      expect(result.data).toMatchObject({
        doctorId: null,
        slots: [
          { time: '09:00', doctorIds: ['d1'] },
          { time: '09:30', doctorIds: ['d1', 'd2'] },
          { time: '10:00', doctorIds: ['d2'] },
          { time: '10:30', doctorIds: ['d2'] },
        ],
      });
    });

    it('reports closed days and past days without slots', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);

      const sunday = await availability.execute({
        user: staff,
        query: { date: '2026-03-08' },
      });
      const past = await availability.execute({
        user: staff,
        query: { date: '2026-03-01' },
      });

      expect(sunday.data).toMatchObject({ closed: true, slots: [] });
      expect(past.data).toMatchObject({ closed: true, slots: [] });
    });

    it('fails for a doctor that is not part of the clinic', async () => {
      doctors.findActive.mockResolvedValue([]);

      const result = await availability.execute({
        user: staff,
        query: { date: NEXT_MONDAY, doctorId: 'foreign' },
      });

      expect(result.status).toBe(404);
    });

    it('excludes only the caller-scoped appointment from its own availability result', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);
      appointments.findById.mockResolvedValue(existing('CONFIRMED', 'd1'));

      await availability.execute({
        user: staff,
        query: {
          date: NEXT_MONDAY,
          doctorId: 'd1',
          excludeAppointmentId: APPOINTMENT_ID,
        },
      });

      expect(appointments.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: APPOINTMENT_ID }),
        { branchId: 'branch-1' },
      );
      expect(appointments.findBookedSlots).toHaveBeenCalledWith(
        expect.objectContaining({ excludedAppointmentId: APPOINTMENT_ID }),
      );
    });

    it('does not exclude appointments of another doctor or day', async () => {
      doctors.findActive.mockResolvedValue([doctor('d1')]);
      appointments.findById.mockResolvedValue(existing('CONFIRMED', 'd2'));

      await availability.execute({
        user: staff,
        query: {
          date: NEXT_MONDAY,
          doctorId: 'd1',
          excludeAppointmentId: APPOINTMENT_ID,
        },
      });

      expect(appointments.findBookedSlots).toHaveBeenCalledWith(
        expect.objectContaining({ excludedAppointmentId: undefined }),
      );
    });
  });

  describe('update', () => {
    const changes = {
      patientId: 'patient-2',
      doctorId: 'd2',
      date: NEXT_MONDAY,
      time: '10:00',
      reason: ' Crown ',
      description: ' Bring previous x-ray ',
    };

    it('updates patient, doctor, date, time, treatment and notes after validating the slot', async () => {
      appointments.findById.mockResolvedValue(existing());
      patients.findOne.mockResolvedValue({ id: 'patient-2' });
      doctors.findActive.mockResolvedValue([doctor('d2')]);

      const result = await update.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: changes,
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({
        patientId: 'patient-2',
        doctorId: 'd2',
        time: '10:00',
        reason: 'Crown',
        description: 'Bring previous x-ray',
      });
      expect(appointments.update).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-2',
          doctorId: 'd2',
          reason: 'Crown',
        }),
      );
      expect(appointments.findBookedSlots).toHaveBeenCalledWith({
        doctorIds: ['d2'],
        date: monday,
        excludedAppointmentId: APPOINTMENT_ID,
      });
    });

    it('allows editing details without moving an existing appointment out of its slot', async () => {
      // Even a slot that is now in the past may keep its details edited.
      jest.setSystemTime(new Date('2026-03-09T12:00:00.000Z'));
      appointments.findById.mockResolvedValue(existing());
      patients.findOne.mockResolvedValue({ id: 'patient-1' });
      doctors.findActive.mockResolvedValue([doctor('d1')]);

      const result = await update.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: {
          ...changes,
          patientId: 'patient-1',
          doctorId: 'd1',
          time: '09:00',
        },
      });

      expect(result.status).toBe(200);
      expect(appointments.findBookedSlots).not.toHaveBeenCalled();
      expect(appointments.update).toHaveBeenCalled();
    });

    it('does not let a patient edit a booking for another patient', async () => {
      appointments.findById.mockResolvedValue(existing());

      const result = await update.execute({
        user: { ...staff, role: 'patient', permissions: [] },
        id: APPOINTMENT_ID,
        input: changes,
      });

      expect(result.status).toBe(403);
      expect(appointments.update).not.toHaveBeenCalled();
    });

    it('does not let a doctor reassign appointments', async () => {
      appointments.findById.mockResolvedValue(existing());

      const result = await update.execute({
        user: { ...staff, role: 'doctor' },
        id: APPOINTMENT_ID,
        input: { ...changes, patientId: 'patient-1' },
      });

      expect(result.status).toBe(403);
    });

    it('only allows pending and confirmed bookings to be edited', async () => {
      appointments.findById.mockResolvedValue(existing('COMPLETED'));

      const result = await update.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: changes,
      });

      expect(result.status).toBe(400);
      expect(appointments.update).not.toHaveBeenCalled();
    });

    it('reports unknown appointments as not found', async () => {
      appointments.findById.mockResolvedValue(null);

      const result = await update.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: changes,
      });

      expect(result.status).toBe(404);
    });
  });

  describe('reschedule', () => {
    it('moves the appointment after validating the doctor schedule and the slot', async () => {
      appointments.findById.mockResolvedValue(existing('PENDING'));

      const result = await reschedule.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: { date: NEXT_MONDAY, time: '10:00' },
      });

      expect(result.status).toBe(200);
      expect(result.data).toMatchObject({ time: '10:00', status: 'confirmed' });
      expect(doctors.findProfile).toHaveBeenCalledWith('d1');
      expect(appointments.runWithDoctorLock).toHaveBeenCalledWith(
        'd1',
        expect.any(Function),
      );
    });

    it('refuses a busy slot', async () => {
      appointments.findById.mockResolvedValue(existing());
      appointments.findBookedSlots.mockResolvedValue([
        { doctorId: 'd1', time: at('10:00') },
      ]);

      const result = await reschedule.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: { date: NEXT_MONDAY, time: '10:00' },
      });

      expect(result.status).toBe(409);
      expect(appointments.update).not.toHaveBeenCalled();
    });

    it('refuses to move cancelled appointments before checking the new slot', async () => {
      appointments.findById.mockResolvedValue(existing('CANCELLED'));

      const result = await reschedule.execute({
        user: staff,
        id: APPOINTMENT_ID,
        input: { date: '2026-03-01', time: '10:00' },
      });

      expect(result.data).toMatchObject({
        message: 'Only pending or confirmed appointments can be rescheduled',
      });
    });
  });

  describe('cancel and complete', () => {
    it('cancels an open appointment', async () => {
      appointments.findById.mockResolvedValue(existing());

      const result = await cancel.execute({ user: staff, id: APPOINTMENT_ID });

      expect(result.data).toMatchObject({ status: 'cancelled' });
      expect(appointments.update).toHaveBeenCalledTimes(1);
    });

    it('refuses to cancel a completed appointment', async () => {
      appointments.findById.mockResolvedValue(existing('COMPLETED'));

      const result = await cancel.execute({ user: staff, id: APPOINTMENT_ID });

      expect(result.status).toBe(400);
    });

    it('only lets administrators and doctors complete appointments', async () => {
      const denied = await complete.execute({
        user: staff,
        id: APPOINTMENT_ID,
      });
      expect(denied.status).toBe(403);
      expect(appointments.findById).not.toHaveBeenCalled();

      appointments.findById.mockResolvedValue(existing());
      const done = await complete.execute({
        user: { ...staff, role: 'doctor' },
        id: APPOINTMENT_ID,
      });
      expect(done.data).toMatchObject({ status: 'completed' });
    });

    it('only completes confirmed appointments', async () => {
      appointments.findById.mockResolvedValue(existing('PENDING'));

      const result = await complete.execute({
        user: { ...staff, role: 'admin' },
        id: APPOINTMENT_ID,
      });

      expect(result.status).toBe(400);
    });
  });

  describe('get', () => {
    it('scopes patients to their own appointments', async () => {
      appointments.findViewById.mockResolvedValue(viewOf(existing()));

      await get.execute({
        user: { ...staff, id: 'user-9', role: 'patient', permissions: [] },
        id: APPOINTMENT_ID,
      });

      expect(appointments.findViewById).toHaveBeenCalledWith(
        expect.objectContaining({ value: APPOINTMENT_ID }),
        { branchId: 'branch-1', patientUserId: 'user-9' },
      );
    });

    it('treats malformed ids as not found', async () => {
      const result = await get.execute({ user: staff, id: 'apt-1' });

      expect(result.status).toBe(404);
      expect(appointments.findViewById).not.toHaveBeenCalled();
    });

    it('hides appointments the user may not read', async () => {
      appointments.findViewById.mockResolvedValue(viewOf(existing()));

      const result = await get.execute({
        user: {
          ...staff,
          role: 'doctor',
          permissions: ['appointments.read.assigned'],
        },
        id: APPOINTMENT_ID,
      });

      expect(result.status).toBe(403);
    });
  });

  describe('list', () => {
    const page = {
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    };

    it('maps the filters to repository criteria', async () => {
      appointments.listPaginated.mockResolvedValue(page);

      await list.execute({
        user: staff,
        query: { status: 'confirmed', doctorId: 'd1', page: 2 },
      });

      expect(appointments.listPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-1',
          status: 'CONFIRMED',
          doctorId: 'd1',
          page: 2,
        }),
      );
    });

    it('rejects unsupported filters and reversed dates', async () => {
      const unsupported = await list.execute({
        user: staff,
        query: { role: 'nurse' },
      });
      const reversed = await list.execute({
        user: staff,
        query: { dateFrom: '2026-02-01', dateTo: '2026-01-01' },
      });

      expect(unsupported.status).toBe(400);
      expect(reversed.status).toBe(400);
      expect(appointments.listPaginated).not.toHaveBeenCalled();
    });

    it('restricts doctors with assigned access to their own appointments', async () => {
      appointments.listPaginated.mockResolvedValue(page);

      await list.execute({
        user: {
          ...staff,
          id: 'd9',
          role: 'doctor',
          permissions: ['appointments.read.assigned'],
        },
        query: { doctorId: 'another-doctor' },
      });

      expect(appointments.listPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: 'another-doctor',
          restrictToDoctorId: 'd9',
        }),
      );
    });

    it('restricts patients to their own record', async () => {
      appointments.listPaginated.mockResolvedValue(page);
      patients.findOne.mockResolvedValue({ id: 'my-patient' });

      await list.execute({
        user: { ...staff, role: 'patient', permissions: [] },
        query: { patientId: 'other-patient' },
      });

      expect(appointments.listPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'other-patient',
          restrictToPatientId: 'my-patient',
        }),
      );
    });

    it('returns an empty page for patients without a patient record', async () => {
      patients.findOne.mockResolvedValue(null);

      const result = await list.execute({
        user: { ...staff, role: 'patient', permissions: [] },
        query: { page: 1, pageSize: 10 },
      });

      expect(result.data).toMatchObject({ data: [], meta: { total: 0 } });
      expect(appointments.listPaginated).not.toHaveBeenCalled();
    });

    it('requires read access', async () => {
      const result = await list.execute({
        user: { ...staff, role: 'nurse', permissions: [] },
      });

      expect(result.status).toBe(403);
    });
  });
});
