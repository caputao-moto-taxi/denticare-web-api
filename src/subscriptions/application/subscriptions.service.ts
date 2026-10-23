import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  SubscriptionRequestStatus,
} from '../../../generated/prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { AuthUser } from '../../auth/auth-user';
import { PatientExamStorage } from '../../patients/infra/storage/patient-exam-storage';
import { PrismaService } from '../../shared/infra/db/prisma/prisma.service';
import {
  addCalendarMonthsUtc,
  quoteForPlan,
} from '../../plans/domain/subscription-pricing';
import { PaymentProofScanner } from '../infra/security/payment-proof-scanner';
import {
  CreateSubscriptionRequestDto,
  RejectSubscriptionRequestDto,
  PlatformClinicFilterDto,
  RequestSubscriptionInformationDto,
  RespondToInformationRequestDto,
  SubscriptionRequestFilterDto,
  UpdateSubscriptionSettingsDto,
} from '../infra/http/subscription.dto';

const ACTIVE_SUBSCRIPTION_STATUSES = [
  'TRIAL_ACTIVE',
  'ACTIVE',
  'EXPIRING_SOON',
] as const;
const OPEN_REQUEST_STATUSES: SubscriptionRequestStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'INFORMATION_REQUESTED',
];
const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ACCEPTED_PROOFS: Record<string, { mimeType: string; extension: string }> =
  {
    '.pdf': { mimeType: 'application/pdf', extension: '.pdf' },
    '.png': { mimeType: 'image/png', extension: '.png' },
    '.jpg': { mimeType: 'image/jpeg', extension: '.jpg' },
    '.jpeg': { mimeType: 'image/jpeg', extension: '.jpg' },
  };

export interface PaymentProofUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proofStorage: PatientExamStorage,
    private readonly proofScanner: PaymentProofScanner,
  ) {}

  async listOptions() {
    const plans = await this.prisma.plan.findMany({
      where: {
        isSubscriptionOption: true,
        deletedAt: null,
        subscriptionMonths: { not: null },
        subscriptionPrice: { not: null },
      },
      orderBy: { subscriptionMonths: 'asc' },
      select: {
        id: true,
        name: true,
        subscriptionMonths: true,
        subscriptionPrice: true,
      },
    });

    return plans.map((plan) => {
      if (plan.subscriptionMonths === null || !plan.subscriptionPrice) {
        throw new ServiceUnavailableException(
          'A subscription plan is not configured correctly',
        );
      }
      const quote = quoteForPlan(
        plan.subscriptionMonths,
        plan.subscriptionPrice.toString(),
      );
      return { id: plan.id, name: plan.name, ...quote };
    });
  }

  async current(user: AuthUser) {
    const headquarterId = await this.getHeadquarterId(user.branchId);
    const now = new Date();
    let current = await this.prisma.clinicSubscription.findFirst({
      where: {
        headquarterId,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (current && current.expiresAt <= now) {
      const expiredStatus =
        current.status === 'TRIAL_ACTIVE' ? 'TRIAL_EXPIRED' : 'EXPIRED';
      current = await this.prisma.clinicSubscription.update({
        where: { id: current.id },
        data: { status: expiredStatus, endedAt: now },
      });
    }
    if (!current) {
      current = await this.prisma.clinicSubscription.findFirst({
        where: {
          headquarterId,
          status: { in: ['TRIAL_EXPIRED', 'EXPIRED'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const openRequest = await this.prisma.subscriptionRequest.findFirst({
      where: {
        headquarterId,
        status: { in: OPEN_REQUEST_STATUSES },
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        informationRequest: true,
        rejectionReason: true,
        planNameSnapshot: true,
        requestedAmount: true,
        currencyCode: true,
      },
    });

    return {
      subscription: current
        ? {
            id: current.id,
            status: current.status,
            startsAt: current.startsAt,
            expiresAt: current.expiresAt,
            remainingDays: Math.max(
              0,
              Math.ceil(
                (current.expiresAt.getTime() - now.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            ),
            planName: current.planNameSnapshot,
            amount: current.approvedAmount?.toString() ?? null,
            currencyCode: current.currencyCode,
          }
        : null,
      legacyAccess:
        !current && !(await this.hasSubscriptionHistory(headquarterId)),
      openRequest: openRequest
        ? {
            ...openRequest,
            requestedAmount: openRequest.requestedAmount.toString(),
          }
        : null,
    };
  }

  async paymentInstructions() {
    const settings = await this.prisma.subscriptionSettings.findUnique({
      where: { id: 'platform' },
      select: {
        bankName: true,
        accountHolder: true,
        iban: true,
        estimatedReviewHours: true,
      },
    });
    if (!settings) {
      throw new ServiceUnavailableException(
        'Subscription payment instructions are not configured',
      );
    }
    return settings;
  }

  private assertIdempotencyKey(key: string | undefined): asserts key is string {
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
      throw new BadRequestException(
        'A valid Idempotency-Key header is required',
      );
    }
  }

  private async findIdempotentRequest(
    headquarterId: string,
    idempotencyKey: string,
    input: CreateSubscriptionRequestDto,
  ) {
    const existing = await this.prisma.subscriptionRequest.findUnique({
      where: {
        headquarterId_idempotencyKey: { headquarterId, idempotencyKey },
      },
    });
    if (!existing) return null;
    this.assertSameIdempotentRequest(existing, input);
    return this.requestOutput(existing);
  }

  private assertValidProofUpload(
    file: PaymentProofUpload | undefined,
  ): asserts file is PaymentProofUpload {
    if (!file?.buffer?.length || !file.size) {
      throw new BadRequestException('A payment proof file is required');
    }
    if (
      file.size !== file.buffer.length ||
      file.size > MAX_PROOF_SIZE ||
      file.buffer.length > MAX_PROOF_SIZE
    ) {
      throw new BadRequestException('Payment proof must not exceed 5 MB');
    }
  }

  private async getRequestPlanAndPayment(input: CreateSubscriptionRequestDto) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: input.planId,
        isSubscriptionOption: true,
        deletedAt: null,
        subscriptionMonths: { not: null },
        subscriptionPrice: { not: null },
      },
      select: {
        id: true,
        name: true,
        subscriptionMonths: true,
        subscriptionPrice: true,
      },
    });
    if (!plan?.subscriptionMonths || !plan.subscriptionPrice) {
      throw new NotFoundException('Subscription plan was not found');
    }
    const quote = quoteForPlan(
      plan.subscriptionMonths,
      plan.subscriptionPrice.toString(),
    );
    if (!new Prisma.Decimal(input.amountPaid).equals(quote.amount)) {
      throw new BadRequestException(
        'The amount paid does not match the selected subscription plan',
      );
    }
    const paymentDate = new Date(input.paymentDate);
    if (Number.isNaN(paymentDate.getTime()) || paymentDate > new Date()) {
      throw new BadRequestException('Payment date must not be in the future');
    }
    return { plan, quote, paymentDate };
  }

  private async assertNoOpenRequest(headquarterId: string) {
    const openRequest = await this.prisma.subscriptionRequest.findFirst({
      where: { headquarterId, status: { in: OPEN_REQUEST_STATUSES } },
      select: { id: true },
    });
    if (openRequest) {
      throw new ConflictException(
        'A subscription payment request is already awaiting review',
      );
    }
  }

  async createRequest(
    user: AuthUser,
    idempotencyKey: string | undefined,
    input: CreateSubscriptionRequestDto,
    file: PaymentProofUpload | undefined,
  ) {
    this.assertIdempotencyKey(idempotencyKey);
    const headquarterId = await this.getHeadquarterId(user.branchId);
    const existing = await this.findIdempotentRequest(
      headquarterId,
      idempotencyKey,
      input,
    );
    if (existing) return existing;
    this.assertValidProofUpload(file);
    const { plan, quote, paymentDate } =
      await this.getRequestPlanAndPayment(input);
    const proof = this.validateProof(file);
    await this.proofScanner.scan(file.buffer);
    await this.assertNoOpenRequest(headquarterId);

    const storageKey = `subscription-proofs/${randomUUID()}`;
    await this.proofStorage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: proof.mimeType,
    });

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const request = await transaction.subscriptionRequest.create({
          data: {
            headquarterId,
            planId: plan.id,
            submittedByUserId: user.id,
            paymentDate,
            amountPaid: new Prisma.Decimal(input.amountPaid),
            currencyCode: quote.currencyCode,
            paymentReference: input.paymentReference?.trim() || null,
            notes: input.notes?.trim() || null,
            proofStorageKey: storageKey,
            proofMimeType: proof.mimeType,
            proofOriginalFileName: proof.safeFileName,
            proofSizeBytes: file.size,
            planNameSnapshot: plan.name,
            durationMonths: quote.months,
            originalAmount: new Prisma.Decimal(quote.originalAmount),
            requestedAmount: new Prisma.Decimal(quote.amount),
            savingsAmount: new Prisma.Decimal(quote.savingsAmount),
            discountPercent: new Prisma.Decimal(quote.discountPercent),
            idempotencyKey,
          },
        });
        await transaction.subscriptionAudit.create({
          data: {
            requestId: request.id,
            headquarterId,
            actorUserId: user.id,
            action: 'REQUEST_SUBMITTED',
            details: { amount: quote.amount, durationMonths: quote.months },
          },
        });
        return this.requestOutput(request);
      });
    } catch (error) {
      try {
        await this.proofStorage.delete(storageKey);
      } catch (cleanupError) {
        this.logger.error(
          `Could not remove orphaned subscription proof ${storageKey}`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subscription request already exists for this idempotency key',
        );
      }
      throw error;
    }
  }

  async listMyRequests(user: AuthUser) {
    const headquarterId = await this.getHeadquarterId(user.branchId);
    const requests = await this.prisma.subscriptionRequest.findMany({
      where: { headquarterId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        paymentDate: true,
        paymentReference: true,
        planNameSnapshot: true,
        durationMonths: true,
        amountPaid: true,
        currencyCode: true,
        informationRequest: true,
        clinicResponse: true,
        rejectionReason: true,
        notes: true,
      },
    });
    return requests.map((request) => ({
      ...request,
      amountPaid: request.amountPaid.toString(),
    }));
  }

  async history(user: AuthUser) {
    const headquarterId = await this.getHeadquarterId(user.branchId);
    const subscriptions = await this.prisma.clinicSubscription.findMany({
      where: { headquarterId },
      orderBy: { startsAt: 'desc' },
      select: {
        id: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        endedAt: true,
        planNameSnapshot: true,
        durationMonths: true,
        approvedAmount: true,
        currencyCode: true,
      },
    });
    return subscriptions.map((subscription) => ({
      ...subscription,
      approvedAmount: subscription.approvedAmount?.toString() ?? null,
    }));
  }

  async respondToInformationRequest(
    user: AuthUser,
    requestId: string,
    input: RespondToInformationRequestDto,
  ) {
    const headquarterId = await this.getHeadquarterId(user.branchId);
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.subscriptionRequest.findFirst({
        where: { id: requestId, headquarterId },
        select: { id: true, status: true },
      });
      if (!request)
        throw new NotFoundException('Subscription request not found');
      if (request.status !== 'INFORMATION_REQUESTED') {
        throw new ConflictException(
          'This request is not awaiting additional information',
        );
      }
      const updated = await transaction.subscriptionRequest.update({
        where: { id: request.id },
        data: {
          status: 'UNDER_REVIEW',
          clinicResponse: input.response.trim(),
          informationRequest: null,
        },
      });
      await transaction.subscriptionAudit.create({
        data: {
          requestId: request.id,
          headquarterId,
          actorUserId: user.id,
          action: 'INFORMATION_PROVIDED',
          details: { response: input.response.trim() },
        },
      });
      return this.requestOutput(updated);
    });
  }

  async listAdminRequests(filter: SubscriptionRequestFilterDto) {
    const where: Prisma.SubscriptionRequestWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.planId ? { planId: filter.planId } : {}),
      ...(filter.headquarterId ? { headquarterId: filter.headquarterId } : {}),
      ...(filter.clinic
        ? {
            headquarter: {
              is: {
                name: { contains: filter.clinic.trim(), mode: 'insensitive' },
              },
            },
          }
        : {}),
      ...(filter.plan
        ? {
            plan: {
              is: {
                name: { contains: filter.plan.trim(), mode: 'insensitive' },
              },
            },
          }
        : {}),
      ...(filter.from || filter.to
        ? {
            submittedAt: {
              ...(filter.from ? { gte: new Date(filter.from) } : {}),
              ...(filter.to ? { lte: new Date(filter.to) } : {}),
            },
          }
        : {}),
    };
    const [total, requests] = await this.prisma.$transaction([
      this.prisma.subscriptionRequest.count({ where }),
      this.prisma.subscriptionRequest.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        include: {
          headquarter: { select: { id: true, name: true, email: true } },
          submittedBy: { select: { id: true, email: true } },
          reviewedBy: { select: { id: true, email: true } },
          auditEntries: {
            orderBy: { createdAt: 'asc' },
            include: { actor: { select: { id: true, email: true } } },
          },
        },
      }),
    ]);
    return {
      items: requests.map((request) => this.requestOutput(request)),
      meta: {
        total,
        page: filter.page,
        pageSize: filter.pageSize,
        totalPages: Math.ceil(total / filter.pageSize),
      },
    };
  }

  async platformOverview() {
    const [
      clinicCount,
      activeSubscriptions,
      expiredSubscriptions,
      pendingRequests,
    ] = await Promise.all([
      this.prisma.headquarter.count({ where: { deletedAt: null } }),
      this.prisma.clinicSubscription.count({
        where: { status: { in: ['ACTIVE', 'EXPIRING_SOON', 'TRIAL_ACTIVE'] } },
      }),
      this.prisma.clinicSubscription.count({
        where: { status: { in: ['EXPIRED', 'TRIAL_EXPIRED'] } },
      }),
      this.prisma.subscriptionRequest.count({
        where: { status: { in: OPEN_REQUEST_STATUSES } },
      }),
    ]);

    return {
      clinicCount,
      activeSubscriptions,
      expiredSubscriptions,
      pendingRequests,
    };
  }

  async listPlatformClinics(filter: PlatformClinicFilterDto) {
    const search = filter.search?.trim();
    const where: Prisma.HeadquarterWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, clinics] = await this.prisma.$transaction([
      this.prisma.headquarter.count({ where }),
      this.prisma.headquarter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: { select: { Branch: true } },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              expiresAt: true,
              planNameSnapshot: true,
            },
          },
        },
      }),
    ]);

    return {
      items: clinics.map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        createdAt: clinic.createdAt,
        branchCount: clinic._count.Branch,
        subscription: clinic.subscriptions[0] ?? null,
      })),
      meta: {
        total,
        page: filter.page,
        pageSize: filter.pageSize,
        totalPages: Math.ceil(total / filter.pageSize),
      },
    };
  }

  async getAdminRequest(requestId: string) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
      include: {
        headquarter: {
          select: { id: true, name: true, email: true, phone: true },
        },
        plan: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, email: true } },
        reviewedBy: { select: { id: true, email: true } },
        auditEntries: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, email: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Subscription request not found');
    return this.requestOutput(request);
  }

  async getProof(requestId: string, user: AuthUser) {
    const request = await this.prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        headquarterId: true,
        proofStorageKey: true,
        proofMimeType: true,
        proofOriginalFileName: true,
      },
    });
    if (!request) throw new NotFoundException('Subscription request not found');
    await this.prisma.subscriptionAudit.create({
      data: {
        requestId,
        headquarterId: request.headquarterId,
        actorUserId: user.id,
        action: 'PROOF_ACCESSED',
      },
    });
    const file = await this.proofStorage.get(request.proofStorageKey);
    return {
      id: request.id,
      mimeType: request.proofMimeType,
      fileName: request.proofOriginalFileName,
      data: file.data,
    };
  }

  async markUnderReview(requestId: string, user: AuthUser) {
    return this.reviewRequest(
      requestId,
      user,
      ['PENDING'],
      async (tx, request) => {
        const updated = await tx.subscriptionRequest.update({
          where: { id: request.id },
          data: {
            status: 'UNDER_REVIEW',
            reviewedByUserId: user.id,
            reviewedAt: new Date(),
          },
        });
        await tx.subscriptionAudit.create({
          data: {
            requestId,
            headquarterId: request.headquarterId,
            actorUserId: user.id,
            action: 'REVIEW_STARTED',
          },
        });
        return this.requestOutput(updated);
      },
    );
  }

  async requestMoreInformation(
    requestId: string,
    user: AuthUser,
    input: RequestSubscriptionInformationDto,
  ) {
    return this.reviewRequest(
      requestId,
      user,
      ['PENDING', 'UNDER_REVIEW'],
      async (tx, request) => {
        const updated = await tx.subscriptionRequest.update({
          where: { id: request.id },
          data: {
            status: 'INFORMATION_REQUESTED',
            informationRequest: input.message.trim(),
            reviewedByUserId: user.id,
            reviewedAt: new Date(),
          },
        });
        await tx.subscriptionAudit.create({
          data: {
            requestId,
            headquarterId: request.headquarterId,
            actorUserId: user.id,
            action: 'INFORMATION_REQUESTED',
            details: { message: input.message.trim() },
          },
        });
        await this.enqueueNotification(tx, {
          recipient: request.submittedBy.email,
          eventType: 'SUBSCRIPTION_INFORMATION_REQUESTED',
          dedupeKey: `subscription-request:${requestId}:information:${Date.now()}`,
          payload: {
            requestId,
            message: input.message.trim(),
          },
        });
        return this.requestOutput(updated);
      },
    );
  }

  async reject(
    requestId: string,
    user: AuthUser,
    input: RejectSubscriptionRequestDto,
  ) {
    return this.reviewRequest(
      requestId,
      user,
      ['PENDING', 'UNDER_REVIEW', 'INFORMATION_REQUESTED'],
      async (tx, request) => {
        const updated = await tx.subscriptionRequest.update({
          where: { id: request.id },
          data: {
            status: 'REJECTED',
            rejectionReason: input.reason.trim(),
            reviewedByUserId: user.id,
            reviewedAt: new Date(),
          },
        });
        await tx.subscriptionAudit.create({
          data: {
            requestId,
            headquarterId: request.headquarterId,
            actorUserId: user.id,
            action: 'REJECTED',
            details: { reason: input.reason.trim() },
          },
        });
        await this.enqueueNotification(tx, {
          recipient: request.submittedBy.email,
          eventType: 'SUBSCRIPTION_REJECTED',
          dedupeKey: `subscription-request:${requestId}:rejected`,
          payload: { requestId, reason: input.reason.trim() },
        });
        return this.requestOutput(updated);
      },
    );
  }

  async approve(requestId: string, user: AuthUser) {
    return this.reviewRequest(
      requestId,
      user,
      ['PENDING', 'UNDER_REVIEW', 'INFORMATION_REQUESTED'],
      async (transaction, request) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT "id" FROM "headquarters" WHERE "id" = ${request.headquarterId} FOR UPDATE`,
        );
        const lockedRequest = await transaction.subscriptionRequest.findUnique({
          where: { id: requestId },
          include: {
            submittedBy: { select: { email: true } },
          },
        });
        if (
          !lockedRequest ||
          !OPEN_REQUEST_STATUSES.includes(lockedRequest.status)
        ) {
          throw new ConflictException(
            'Subscription request has already been reviewed',
          );
        }

        const now = new Date();
        const existing = await transaction.clinicSubscription.findFirst({
          where: {
            headquarterId: request.headquarterId,
            status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) {
          await transaction.clinicSubscription.update({
            where: { id: existing.id },
            data: {
              status:
                existing.status === 'TRIAL_ACTIVE'
                  ? 'TRIAL_EXPIRED'
                  : 'CANCELLED',
              endedAt: now,
            },
          });
        }

        const expiresAt = addCalendarMonthsUtc(now, request.durationMonths);
        const subscription = await transaction.clinicSubscription.create({
          data: {
            headquarterId: request.headquarterId,
            planId: request.planId,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt,
            planNameSnapshot: request.planNameSnapshot,
            durationMonths: request.durationMonths,
            approvedAmount: request.requestedAmount,
            originalAmount: request.originalAmount,
            savingsAmount: request.savingsAmount,
            discountPercent: request.discountPercent,
            currencyCode: request.currencyCode,
            approvedByUserId: user.id,
          },
        });
        const updated = await transaction.subscriptionRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedByUserId: user.id,
            reviewedAt: now,
            subscriptionId: subscription.id,
          },
        });
        await transaction.subscriptionAudit.createMany({
          data: [
            {
              requestId,
              headquarterId: request.headquarterId,
              actorUserId: user.id,
              action: 'APPROVED',
              details: {
                subscriptionId: subscription.id,
                amount: subscription.approvedAmount.toString(),
                startsAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
              },
            },
            ...(existing
              ? [
                  {
                    requestId,
                    headquarterId: request.headquarterId,
                    actorUserId: user.id,
                    action: 'PREVIOUS_SUBSCRIPTION_ENDED',
                    details: {
                      previousSubscriptionId: existing.id,
                      endedAt: now.toISOString(),
                    },
                  },
                ]
              : []),
          ],
        });
        await this.enqueueNotification(transaction, {
          recipient: lockedRequest.submittedBy.email,
          eventType: 'SUBSCRIPTION_APPROVED',
          dedupeKey: `subscription-request:${requestId}:approved`,
          payload: {
            requestId,
            planName: subscription.planNameSnapshot,
            expiresAt: expiresAt.toISOString(),
          },
        });
        return this.requestOutput(updated);
      },
    );
  }

  updateSettings(user: AuthUser, input: UpdateSubscriptionSettingsDto) {
    return this.prisma.subscriptionSettings.upsert({
      where: { id: 'platform' },
      create: {
        id: 'platform',
        bankName: input.bankName.trim(),
        accountHolder: input.accountHolder.trim(),
        iban: input.iban.replace(/\s+/g, '').toUpperCase(),
        estimatedReviewHours: input.estimatedReviewHours,
        updatedByUserId: user.id,
      },
      update: {
        bankName: input.bankName.trim(),
        accountHolder: input.accountHolder.trim(),
        iban: input.iban.replace(/\s+/g, '').toUpperCase(),
        estimatedReviewHours: input.estimatedReviewHours,
        updatedByUserId: user.id,
      },
      select: {
        bankName: true,
        accountHolder: true,
        iban: true,
        estimatedReviewHours: true,
        updatedAt: true,
      },
    });
  }

  private async reviewRequest<T>(
    requestId: string,
    actor: AuthUser,
    allowedStatuses: SubscriptionRequestStatus[],
    action: (
      transaction: Prisma.TransactionClient,
      request: {
        id: string;
        headquarterId: string;
        submittedBy: { email: string };
        status: SubscriptionRequestStatus;
        planId: string;
        planNameSnapshot: string;
        durationMonths: number;
        requestedAmount: Prisma.Decimal;
        originalAmount: Prisma.Decimal;
        savingsAmount: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        currencyCode: string;
      },
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "subscription_requests" WHERE "id" = ${requestId} FOR UPDATE`,
      );
      const request = await transaction.subscriptionRequest.findUnique({
        where: { id: requestId },
        include: { submittedBy: { select: { email: true } } },
      });
      if (!request)
        throw new NotFoundException('Subscription request not found');
      if (!allowedStatuses.includes(request.status)) {
        throw new ConflictException(
          'Subscription request cannot be reviewed in its current state',
        );
      }
      return action(transaction, request);
    });
  }

  private async enqueueNotification(
    transaction: Prisma.TransactionClient,
    notification: {
      recipient: string;
      eventType: string;
      dedupeKey: string;
      payload: Prisma.InputJsonObject;
    },
  ) {
    await transaction.notificationOutbox.upsert({
      where: { dedupeKey: notification.dedupeKey },
      create: notification,
      update: {},
    });
  }

  private async getHeadquarterId(branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { headquarterId: true },
    });
    if (!branch) throw new NotFoundException('Clinic branch was not found');
    return branch.headquarterId;
  }

  private async hasSubscriptionHistory(headquarterId: string) {
    return Boolean(
      await this.prisma.clinicSubscription.findFirst({
        where: { headquarterId },
        select: { id: true },
      }),
    );
  }

  private validateProof(file: PaymentProofUpload) {
    const extension = extname(file.originalname).toLowerCase();
    const type = ACCEPTED_PROOFS[extension];
    if (!type?.mimeType || file.mimetype !== type.mimeType) {
      throw new BadRequestException(
        'Payment proof must be a PDF, PNG, JPG, or JPEG file',
      );
    }
    const signatureValid =
      (type.mimeType === 'application/pdf' &&
        file.buffer.subarray(0, 5).toString('ascii') === '%PDF-') ||
      (type.mimeType === 'image/png' &&
        file.buffer
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          )) ||
      (type.mimeType === 'image/jpeg' &&
        file.buffer[0] === 0xff &&
        file.buffer[1] === 0xd8 &&
        file.buffer[2] === 0xff);
    if (!signatureValid) {
      throw new BadRequestException(
        'The uploaded payment proof does not match its declared file type',
      );
    }
    const safeFileName = `${randomUUID()}${type.extension}`;
    return { mimeType: type.mimeType, safeFileName };
  }

  private assertSameIdempotentRequest(
    existing: { planId: string; amountPaid: Prisma.Decimal },
    input: CreateSubscriptionRequestDto,
  ) {
    if (
      existing.planId !== input.planId ||
      !existing.amountPaid.equals(input.amountPaid)
    ) {
      throw new ConflictException(
        'Idempotency-Key was already used for a different subscription request',
      );
    }
  }

  private requestOutput(request: object): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(request)
        .filter(([key]) => key !== 'proofStorageKey')
        .map(([key, value]) => [
          key,
          value instanceof Prisma.Decimal ? value.toString() : value,
        ]),
    );
  }
}
