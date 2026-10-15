import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthUser } from '../../../../auth/auth-user';
import { PatientsPrismaRepository } from '../../../../patients/infra/db/prisma/patients-prisma.repository';
import { DoctorsPrismaRepository } from '../../../../doctors/infra/db/prisma/doctors-prisma.repository';
import { AppointmentsPrismaRepository } from '../../../../appointments/infra/db/prisma/appointments-prisma.repository';
import { UsersPrismaRepository } from '../../../../users/infra/db/prisma/users-prisma.repository';
import { StockPrismaRepository } from '../../../../stock/infra/db/prisma/stock-prisma.repository';
import { TreatmentPlansPrismaRepository } from '../../../../treatment-plans/infra/db/prisma/treatment-plans-prisma.repository';
import { ChatPrismaRepository } from '../../../../chat/infra/db/prisma/chat-prisma.repository';
import { PlanPrismaRepository } from '../../../../plans/infra/db/prisma/plan-prisma.repository';
import { ListPlansUseCase } from '../../../../plans/application/useCases/list-plans/list-plans-use-case';
import { ListQuery } from '../../../domain/list-query';
import { PrismaService } from './prisma.service';

describe('Database listing pagination', () => {
  const user: AuthUser = {
    id: 'me',
    email: 'me@example.test',
    role: 'admin',
    branchId: 'my-clinic',
  };
  const model = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(51),
    findFirst: jest.fn().mockResolvedValue({ id: 'thread', starterId: 'me' }),
    fields: { totalSteps: { modelName: 'TreatmentPlan', name: 'totalSteps' } },
  });
  const models = {
    person: model(),
    user: model(),
    appointment: model(),
    stockItem: model(),
    treatmentPlan: model(),
    chatConversation: model(),
    chatMessage: model(),
    plan: model(),
  };
  const prisma = {
    ...models,
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const hash = { hashPassword: jest.fn(), compare: jest.fn() };
  let module: TestingModule;
  let list: Record<
    string,
    (query: ListQuery, caller?: AuthUser) => Promise<unknown>
  >;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        PatientsPrismaRepository,
        AppointmentsPrismaRepository,
        StockPrismaRepository,
        TreatmentPlansPrismaRepository,
        ChatPrismaRepository,
        {
          provide: DoctorsPrismaRepository,
          useFactory: (db: PrismaService) =>
            new DoctorsPrismaRepository(db, hash),
          inject: [PrismaService],
        },
        {
          provide: UsersPrismaRepository,
          useFactory: (db: PrismaService) =>
            new UsersPrismaRepository(db, hash),
          inject: [PrismaService],
        },
      ],
    }).compile();
    list = {
      patients: (query, caller = user) =>
        module.get(PatientsPrismaRepository).list(caller, query),
      doctors: (query) => module.get(DoctorsPrismaRepository).list(user, query),
      appointments: (query, caller = user) =>
        module.get(AppointmentsPrismaRepository).list(caller, query),
      users: (query) => module.get(UsersPrismaRepository).list(user, query),
      stock: (query) => module.get(StockPrismaRepository).list(user, query),
      treatments: (query) =>
        module.get(TreatmentPlansPrismaRepository).list(user, query),
      conversations: (query) =>
        module.get(ChatPrismaRepository).list(user, query),
      contacts: (query) =>
        module.get(ChatPrismaRepository).contacts(user, query),
      messages: (query) =>
        module.get(ChatPrismaRepository).messages(user, 'thread', query),
      plans: (query) =>
        new PlanPrismaRepository(module.get(PrismaService)).listPaginated(
          query,
        ),
    };
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(() => module.close());

  const cases = [
    ['patients', 'person', { status: 'active' }],
    [
      'doctors',
      'user',
      { status: 'inactive', type: 'PART_TIME', specialty: 'Dentistry' },
    ],
    [
      'appointments',
      'appointment',
      { status: 'confirmed', doctorId: 'd1', patientId: 'p1' },
    ],
    ['users', 'user', { role: 'nurse', status: 'active' }],
    ['stock', 'stockItem', { category: 'protection' }],
    ['treatments', 'treatmentPlan', { status: 'in-progress', doctorId: 'd1' }],
    ['conversations', 'chatConversation', { category: 'staff' }],
    ['contacts', 'user', { role: 'doctor' }],
    ['messages', 'chatMessage', {}],
    ['plans', 'plan', {}],
  ] as const;

  it.each(cases)(
    '%s paginates in the database and counts the same filtered scope',
    async (name, entity, filters) => {
      const query = {
        ...filters,
        page: 3,
        pageSize: 25,
        search: 'Ana Costa',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      };
      await expect(list[name](query)).resolves.toMatchObject({
        data: [],
        meta: { page: 3, pageSize: 25, total: 51, totalPages: 3 },
      });
      const target = models[entity];
      const [find] = target.findMany.mock.calls[0];
      expect(find).toMatchObject({
        skip: 50,
        take: 25,
        orderBy: expect.any(Array),
      });
      expect(target.count).toHaveBeenCalledWith({ where: find.where });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const where = find.where;
      if (!['plans', 'messages'].includes(name)) {
        expect(where).toMatchObject(
          entity === 'appointment'
            ? { doctor: { branchId: 'my-clinic' } }
            : {
                branchId: 'my-clinic',
                ...(entity !== 'chatConversation' && { deletedAt: null }),
              },
        );
      }
      if (name === 'conversations') {
        expect(where.OR).toEqual([{ starterId: 'me' }, { recipientId: 'me' }]);
      }
      const dateField =
        name === 'appointments'
          ? 'date'
          : name === 'treatments'
            ? 'startDate'
            : name === 'conversations'
              ? 'updatedAt'
              : 'createdAt';
      expect(where[dateField]).toEqual({
        gte: new Date('2026-01-01T00:00:00Z'),
        lt: new Date('2026-02-01T00:00:00Z'),
      });
    },
  );

  it.each(cases)(
    '%s rejects reversed dates before executing a list query',
    async (name, entity) => {
      await expect(
        list[name]({ dateFrom: '2026-02-01', dateTo: '2026-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(models[entity].findMany).not.toHaveBeenCalled();
    },
  );

  it('does not allow a doctor filter to override the authenticated doctor scope', async () => {
    await list.appointments(
      { doctorId: 'another-doctor' },
      { ...user, role: 'doctor' },
    );
    expect(models.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorId: 'me',
          AND: [{ doctorId: 'another-doctor' }],
        }),
      }),
    );
  });

  it('does not allow a patient filter to override the authenticated patient scope', async () => {
    models.person.findFirst.mockResolvedValueOnce({ id: 'my-patient' });
    await list.appointments(
      { patientId: 'other-patient' },
      { ...user, role: 'patient' },
    );
    expect(models.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId: 'my-patient',
          AND: [{ patientId: 'other-patient' }],
        }),
      }),
    );
  });

  it('keeps patient accounts restricted to their own person record', async () => {
    await list.patients({ search: 'Ana' }, { ...user, role: 'patient' });
    expect(models.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'me', branchId: 'my-clinic' }),
      }),
    );
  });

  it('keeps conversation membership validation when paging message history', async () => {
    models.chatConversation.findFirst.mockResolvedValueOnce(null);
    await expect(list.messages({ page: 2 })).rejects.toThrow(
      'Conversation not found',
    );
    expect(models.chatMessage.findMany).not.toHaveBeenCalled();
  });

  it('preserves HTTP 400 errors through the subscription-plan use case', async () => {
    const useCase = new ListPlansUseCase(
      new PlanPrismaRepository(module.get(PrismaService)),
    );
    await expect(useCase.execute({ status: 'active' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['planned', 'in-progress', 'completed'])(
    'applies the derived %s treatment status in SQL',
    async (status) => {
      await list.treatments({ status });
      const [find] = models.treatmentPlan.findMany.mock.calls[0];
      expect(find.where.completedSteps).toEqual(
        status === 'planned'
          ? 0
          : status === 'completed'
            ? { gte: models.treatmentPlan.fields.totalSteps }
            : { gt: 0, lt: models.treatmentPlan.fields.totalSteps },
      );
    },
  );
});
