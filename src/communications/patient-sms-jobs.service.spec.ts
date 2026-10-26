import { CommunicationDeliveryService } from './communication-delivery.service';
import { PatientSmsJobsService } from './patient-sms-jobs.service';
import {
  PatientSmsJobsRepository,
  PatientSmsNotification,
} from './application/patient-sms-jobs.repository';

describe('PatientSmsJobsService', () => {
  const now = new Date('2026-10-26T09:00:00.000Z');

  let repository: ReturnType<typeof createRepositoryMock>;
  let delivery: { sendSmsBatch: jest.Mock };
  let service: PatientSmsJobsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    repository = createRepositoryMock();
    delivery = { sendSmsBatch: jest.fn().mockResolvedValue([true]) };
    service = new PatientSmsJobsService(
      repository as unknown as PatientSmsJobsRepository,
      delivery as unknown as CommunicationDeliveryService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends an SMS for a pending appointment 24 hours ahead', async () => {
    repository.findReminderAppointments.mockResolvedValue([
      {
        id: 'appointment-1',
        date: new Date('2026-10-27T00:00:00.000Z'),
        time: new Date('1970-01-01T10:00:00.000Z'),
        patient: { phoneNumber: '923000001' },
      },
    ]);
    repository.findReminderAppointment.mockResolvedValue({
      date: new Date('2026-10-27T00:00:00.000Z'),
      time: new Date('1970-01-01T10:00:00.000Z'),
      status: 'PENDING',
      deletedAt: null,
      patient: {
        phoneNumber: '923000001',
        isActive: true,
        deletedAt: null,
      },
      doctor: { branch: { timezone: 'Africa/Luanda' } },
    });

    await service.runPatientSmsJobs();

    expect(repository.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PATIENT_APPOINTMENT_REMINDER_SMS',
        recipient: '+244923000001',
      }),
    );
    expect(delivery.sendSmsBatch).toHaveBeenCalledWith(
      ['+244923000001'],
      expect.stringContaining('27/10/2026 às 10:00'),
    );
  });

  it('sends birthday SMS only to patients with current marketing consent', async () => {
    repository.findBirthdayCandidates.mockResolvedValue([
      {
        id: 'patient-1',
        firstName: 'Ana',
        birthDate: new Date('1990-10-26T00:00:00.000Z'),
        phoneNumber: '923000001',
      },
    ]);
    repository.findBirthdayPatient.mockResolvedValue({
      firstName: 'Ana',
      birthDate: new Date('1990-10-26T00:00:00.000Z'),
      phoneNumber: '923000001',
      marketingSmsConsent: true,
      isActive: true,
      deletedAt: null,
      Role: { slug: 'patient' },
      branch: { timezone: 'Africa/Luanda' },
    });

    await service.runPatientSmsJobs();

    expect(repository.findBirthdayCandidates).toHaveBeenCalledWith('branch-1');
    expect(delivery.sendSmsBatch).toHaveBeenCalledWith(
      ['+244923000001'],
      expect.stringContaining('Feliz aniversário, Ana!'),
    );
  });

  it('skips a birthday SMS if marketing consent is withdrawn before delivery', async () => {
    repository.findBirthdayCandidates.mockResolvedValue([
      {
        id: 'patient-1',
        firstName: 'Ana',
        birthDate: new Date('1990-10-26T00:00:00.000Z'),
        phoneNumber: '923000001',
      },
    ]);
    repository.findBirthdayPatient.mockResolvedValue({
      firstName: 'Ana',
      birthDate: new Date('1990-10-26T00:00:00.000Z'),
      phoneNumber: '923000001',
      marketingSmsConsent: false,
      isActive: true,
      deletedAt: null,
      Role: { slug: 'patient' },
      branch: { timezone: 'Africa/Luanda' },
    });

    await service.runPatientSmsJobs();

    expect(delivery.sendSmsBatch).not.toHaveBeenCalled();
  });
});

function createRepositoryMock() {
  const notifications: PatientSmsNotification[] = [];
  return {
    listActiveBranches: jest
      .fn()
      .mockResolvedValue([{ id: 'branch-1', timezone: 'Africa/Luanda' }]),
    findReminderAppointments: jest.fn().mockResolvedValue([]),
    findBirthdayCandidates: jest.fn().mockResolvedValue([]),
    enqueueNotification: jest.fn(async (input) => {
      notifications.push({
        id: `notification-${notifications.length + 1}`,
        attempts: 0,
        eventType: input.eventType,
        payload: input.payload,
      });
    }),
    claimNotifications: jest.fn(async () => notifications.splice(0)),
    findReminderAppointment: jest.fn(),
    findBirthdayPatient: jest.fn(),
    markNotificationSent: jest.fn(),
    scheduleNotificationRetry: jest.fn(),
  };
}
