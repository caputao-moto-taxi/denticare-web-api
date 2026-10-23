import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { AuthUser } from '../../auth/auth-user';
import { PrismaService } from '../../shared/infra/db/prisma/prisma.service';
import {
  PlatformClinicFilterDto,
  UpdatePlatformClinicDto,
} from '../infra/http/platform-admin.dto';

const MANAGED_STAFF_ROLES = [
  'admin',
  'administrator',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
];

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      clinicCount,
      activeClinics,
      inactiveClinics,
      patientCount,
      doctorCount,
      activeSubscriptions,
      pendingRequests,
    ] = await Promise.all([
      this.prisma.headquarter.count({ where: { deletedAt: null } }),
      this.prisma.headquarter.count({
        where: { deletedAt: null, isActive: true },
      }),
      this.prisma.headquarter.count({
        where: { deletedAt: null, isActive: false },
      }),
      this.prisma.person.count({
        where: {
          deletedAt: null,
          Role: { slug: 'patient' },
          branch: {
            is: { deletedAt: null, headquarter: { is: { deletedAt: null } } },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          isActive: true,
          Role: { slug: 'doctor' },
          branch: {
            is: { deletedAt: null, headquarter: { is: { deletedAt: null } } },
          },
        },
      }),
      this.prisma.clinicSubscription.count({
        where: { status: { in: ['ACTIVE', 'EXPIRING_SOON', 'TRIAL_ACTIVE'] } },
      }),
      this.prisma.subscriptionRequest.count({
        where: {
          status: { in: ['PENDING', 'UNDER_REVIEW', 'INFORMATION_REQUESTED'] },
        },
      }),
    ]);

    return {
      clinicCount,
      activeClinics,
      inactiveClinics,
      patientCount,
      doctorCount,
      activeSubscriptions,
      pendingRequests,
    };
  }

  async listClinics(filter: PlatformClinicFilterDto) {
    const search = filter.search?.trim();
    const where: Prisma.HeadquarterWhereInput = {
      deletedAt: null,
      ...(filter.status ? { isActive: filter.status === 'active' } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { nif: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, clinics] = await this.prisma.$transaction([
      this.prisma.headquarter.count({ where }),
      this.prisma.headquarter.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          Branch: {
            where: { deletedAt: null },
            select: { id: true },
          },
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
    const branchIds = clinics.flatMap((clinic) =>
      clinic.Branch.map((branch) => branch.id),
    );
    const [patientCounts, doctorCounts] = branchIds.length
      ? await Promise.all([
          this.prisma.person.groupBy({
            by: ['branchId'],
            where: {
              branchId: { in: branchIds },
              deletedAt: null,
              Role: { slug: 'patient' },
            },
            _count: { _all: true },
          }),
          this.prisma.user.groupBy({
            by: ['branchId'],
            where: {
              branchId: { in: branchIds },
              deletedAt: null,
              isActive: true,
              Role: { slug: 'doctor' },
            },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const patientCountsByBranch = new Map(
      patientCounts.map((item) => [item.branchId, item._count._all]),
    );
    const doctorCountsByBranch = new Map(
      doctorCounts.map((item) => [item.branchId, item._count._all]),
    );

    return {
      items: clinics.map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        isActive: clinic.isActive,
        createdAt: clinic.createdAt,
        branchCount: clinic.Branch.length,
        patientCount: clinic.Branch.reduce(
          (totalCount, branch) =>
            totalCount + (patientCountsByBranch.get(branch.id) ?? 0),
          0,
        ),
        doctorCount: clinic.Branch.reduce(
          (totalCount, branch) =>
            totalCount + (doctorCountsByBranch.get(branch.id) ?? 0),
          0,
        ),
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

  async clinicDetails(clinicId: string) {
    const clinic = await this.prisma.headquarter.findFirst({
      where: { id: clinicId, deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        email: true,
        phone: true,
        description: true,
        nif: true,
        logo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        plan: { select: { id: true, name: true } },
        Branch: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            timezone: true,
            createdAt: true,
            address: {
              select: {
                street: true,
                city: true,
                province: true,
                country: true,
              },
            },
          },
        },
        subscriptions: {
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
            approvedBy: { select: { id: true, email: true } },
          },
        },
        subscriptionRequests: {
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            paymentDate: true,
            paymentReference: true,
            amountPaid: true,
            requestedAmount: true,
            currencyCode: true,
            planNameSnapshot: true,
            durationMonths: true,
            rejectionReason: true,
            proofMimeType: true,
            proofOriginalFileName: true,
            proofSizeBytes: true,
          },
        },
      },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const branchIds = clinic.Branch.map((branch) => branch.id);
    const [patientCount, doctorCount, staff, audit] = branchIds.length
      ? await Promise.all([
          this.prisma.person.count({
            where: {
              branchId: { in: branchIds },
              deletedAt: null,
              Role: { slug: 'patient' },
            },
          }),
          this.prisma.user.count({
            where: {
              branchId: { in: branchIds },
              deletedAt: null,
              isActive: true,
              Role: { slug: 'doctor' },
            },
          }),
          this.prisma.user.findMany({
            where: {
              branchId: { in: branchIds },
              deletedAt: null,
              Role: { slug: { in: MANAGED_STAFF_ROLES } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            select: {
              id: true,
              email: true,
              isActive: true,
              isEmailVerified: true,
              createdAt: true,
              Role: { select: { slug: true, name: true } },
              Person: {
                where: { deletedAt: null },
                take: 1,
                select: { firstName: true, lastName: true, phoneNumber: true },
              },
              branch: { select: { id: true, name: true } },
            },
          }),
          this.prisma.platformAdminAudit.findMany({
            where: { headquarterId: clinicId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
              actor: { select: { email: true } },
              target: { select: { email: true } },
            },
          }),
        ])
      : [
          0,
          0,
          [],
          await this.prisma.platformAdminAudit.findMany({
            where: { headquarterId: clinicId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
              actor: { select: { email: true } },
              target: { select: { email: true } },
            },
          }),
        ];

    return {
      clinic: {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        email: clinic.email,
        phone: clinic.phone,
        description: clinic.description,
        nif: clinic.nif,
        logo: clinic.logo,
        isActive: clinic.isActive,
        createdAt: clinic.createdAt,
        updatedAt: clinic.updatedAt,
        plan: clinic.plan,
      },
      metrics: { patientCount, doctorCount, staffCount: staff.length },
      branches: clinic.Branch,
      users: staff.map((user) => ({
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        role: user.Role?.slug ?? 'staff',
        roleName: user.Role?.name ?? 'Staff',
        name: user.Person[0]
          ? `${user.Person[0].firstName} ${user.Person[0].lastName}`.trim()
          : user.email,
        phone: user.Person[0]?.phoneNumber ?? null,
        branch: user.branch?.name ?? '',
      })),
      subscriptions: clinic.subscriptions.map((subscription) => ({
        ...subscription,
        approvedAmount: subscription.approvedAmount?.toString() ?? null,
      })),
      paymentHistory: clinic.subscriptionRequests.map((payment) => ({
        ...payment,
        amountPaid: payment.amountPaid.toString(),
        requestedAmount: payment.requestedAmount.toString(),
      })),
      audit: audit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        details: entry.details,
        createdAt: entry.createdAt,
        actorEmail: entry.actor.email,
        targetEmail: entry.target?.email ?? null,
      })),
    };
  }

  async updateClinic(
    clinicId: string,
    actor: AuthUser,
    input: UpdatePlatformClinicDto,
  ) {
    const changes: Prisma.HeadquarterUpdateInput = {};
    if (input.name !== undefined) changes.name = input.name.trim();
    if (input.address !== undefined) changes.address = input.address.trim();
    if (input.email !== undefined) changes.email = input.email?.trim() || null;
    if (input.phone !== undefined) changes.phone = input.phone?.trim() || null;
    if (input.nif !== undefined) changes.nif = input.nif.trim();
    if (input.description !== undefined) {
      changes.description = input.description?.trim() || null;
    }
    if (!Object.keys(changes).length) {
      throw new BadRequestException(
        'At least one clinic field must be provided',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const clinic = await transaction.headquarter.findFirst({
        where: { id: clinicId, deletedAt: null },
        select: { id: true },
      });
      if (!clinic) throw new NotFoundException('Clinic not found');
      const updated = await transaction.headquarter.update({
        where: { id: clinic.id },
        data: changes,
        select: {
          id: true,
          name: true,
          address: true,
          email: true,
          phone: true,
          description: true,
          nif: true,
          isActive: true,
          updatedAt: true,
        },
      });
      await transaction.platformAdminAudit.create({
        data: {
          headquarterId: clinic.id,
          actorUserId: actor.id,
          action: 'CLINIC_UPDATED',
          details: { changedFields: Object.keys(changes) },
        },
      });
      return updated;
    });
  }

  async setClinicStatus(clinicId: string, actor: AuthUser, isActive: boolean) {
    return this.prisma.$transaction(async (transaction) => {
      const clinic = await transaction.headquarter.findFirst({
        where: { id: clinicId, deletedAt: null },
        select: { id: true, isActive: true },
      });
      if (!clinic) throw new NotFoundException('Clinic not found');
      if (clinic.isActive === isActive) return clinic;

      if (!isActive) {
        const branches = await transaction.branch.findMany({
          where: { headquarterId: clinicId },
          select: { id: true },
        });
        const users = branches.length
          ? await transaction.user.findMany({
              where: {
                branchId: { in: branches.map((branch) => branch.id) },
                deletedAt: null,
              },
              select: { id: true },
            })
          : [];
        if (users.length) {
          await transaction.refreshToken.updateMany({
            where: {
              userId: { in: users.map((user) => user.id) },
              revokedAt: null,
            },
            data: { revokedAt: new Date() },
          });
        }
      }

      const updated = await transaction.headquarter.update({
        where: { id: clinicId },
        data: { isActive },
        select: { id: true, isActive: true },
      });
      await transaction.platformAdminAudit.create({
        data: {
          headquarterId: clinicId,
          actorUserId: actor.id,
          action: isActive ? 'CLINIC_ACTIVATED' : 'CLINIC_DEACTIVATED',
          details: { isActive },
        },
      });
      return updated;
    });
  }

  async setUserStatus(
    clinicId: string,
    userId: string,
    actor: AuthUser,
    isActive: boolean,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const clinic = await transaction.headquarter.findFirst({
        where: { id: clinicId, deletedAt: null },
        select: { id: true },
      });
      if (!clinic) throw new NotFoundException('Clinic not found');
      const branches = await transaction.branch.findMany({
        where: { headquarterId: clinicId, deletedAt: null },
        select: { id: true },
      });
      const user = await transaction.user.findFirst({
        where: {
          id: userId,
          branchId: { in: branches.map((branch) => branch.id) },
          deletedAt: null,
          Role: { slug: { in: MANAGED_STAFF_ROLES } },
        },
        select: { id: true, isActive: true, email: true },
      });
      if (!user) throw new NotFoundException('Clinic user not found');
      if (user.isActive === isActive) return { id: user.id, isActive };

      await transaction.user.update({
        where: { id: userId },
        data: { isActive },
      });
      if (!isActive) {
        await transaction.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await transaction.platformAdminAudit.create({
        data: {
          headquarterId: clinicId,
          actorUserId: actor.id,
          targetUserId: userId,
          action: isActive ? 'USER_ACTIVATED' : 'USER_BLOCKED',
          details: { isActive, email: user.email },
        },
      });
      return { id: user.id, isActive };
    });
  }
}
