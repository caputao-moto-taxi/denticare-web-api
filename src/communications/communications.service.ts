import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AuthUser } from '../auth/auth-user';
import {
  CampaignChannel,
  SendCampaignDto,
  UpdatePatientMarketingConsentDto,
} from './communications.dto';
import { CommunicationDeliveryService } from './communication-delivery.service';

const MAX_RECIPIENTS = 250;

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: CommunicationDeliveryService,
  ) {}

  async listCampaigns(user: AuthUser) {
    this.ensureAdmin(user);
    return this.prisma.communicationCampaign.findMany({
      where: { branchId: user.branchId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        channel: true,
        subject: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
        sentAt: true,
        createdAt: true,
      },
    });
  }

  async listAudience(
    user: AuthUser,
    channel: CampaignChannel,
    search?: string,
  ) {
    this.ensureAdmin(user);
    const patients = await this.prisma.person.findMany({
      where: {
        branchId: user.branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'patient' },
        ...(channel === 'EMAIL'
          ? { marketingEmailConsent: true }
          : { marketingSmsConsent: true }),
        ...(search?.trim() && {
          OR: [
            { firstName: { contains: search.trim(), mode: 'insensitive' } },
            { lastName: { contains: search.trim(), mode: 'insensitive' } },
            { email: { contains: search.trim(), mode: 'insensitive' } },
            { phoneNumber: { contains: search.trim() } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });

    return patients
      .map((patient) => {
        const rawContact =
          channel === 'EMAIL' ? patient.email : patient.phoneNumber;
        if (!CommunicationDeliveryService.isValidContact(channel, rawContact)) {
          return null;
        }
        return {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
          contact: CommunicationDeliveryService.normalizeContact(
            channel,
            rawContact!,
          ),
        };
      })
      .filter((patient) => patient !== null);
  }

  async sendCampaign(user: AuthUser, input: SendCampaignDto) {
    this.ensureAdmin(user);
    if (input.channel === 'EMAIL' && !input.subject?.trim()) {
      throw new BadRequestException('An email subject is required');
    }
    if (input.recipientIds.length > MAX_RECIPIENTS) {
      throw new BadRequestException(
        `A campaign cannot contain more than ${MAX_RECIPIENTS} recipients`,
      );
    }

    const recipientIds = [...new Set(input.recipientIds)];
    if (recipientIds.length !== input.recipientIds.length) {
      throw new BadRequestException('Duplicate recipients are not allowed');
    }

    const patients = await this.prisma.person.findMany({
      where: {
        id: { in: recipientIds },
        branchId: user.branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'patient' },
        ...(input.channel === 'EMAIL'
          ? { marketingEmailConsent: true }
          : { marketingSmsConsent: true }),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
      },
    });
    const recipients = patients
      .map((patient) => {
        const rawContact =
          input.channel === 'EMAIL' ? patient.email : patient.phoneNumber;
        if (
          !CommunicationDeliveryService.isValidContact(
            input.channel,
            rawContact,
          )
        ) {
          return null;
        }
        return {
          id: patient.id,
          contact: CommunicationDeliveryService.normalizeContact(
            input.channel,
            rawContact!,
          ),
        };
      })
      .filter((recipient) => recipient !== null);

    if (recipients.length !== recipientIds.length) {
      throw new BadRequestException(
        'Some selected patients no longer consent to this channel or have no valid contact',
      );
    }

    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        branchId: user.branchId,
        createdById: user.id,
        name: input.name.trim(),
        channel: input.channel,
        subject: input.channel === 'EMAIL' ? input.subject!.trim() : null,
        body: input.body.trim(),
        recipientCount: recipients.length,
      },
    });

    let sentCount = 0;
    let failedCount = 0;
    if (input.channel === 'EMAIL') {
      try {
        await this.delivery.sendEmail(
          recipients.map((recipient) => recipient.contact),
          input.subject!.trim(),
          input.body.trim(),
        );
        sentCount = recipients.length;
      } catch {
        failedCount = recipients.length;
      }
    } else {
      for (let index = 0; index < recipients.length; index += 10) {
        const batch = recipients.slice(index, index + 10);
        try {
          const results = await this.delivery.sendSmsBatch(
            batch.map((recipient) => recipient.contact),
            input.body.trim(),
          );
          sentCount += results.filter(Boolean).length;
          failedCount += results.filter((success) => !success).length;
        } catch {
          failedCount += batch.length;
        }
      }
    }

    const status =
      sentCount === 0 ? 'FAILED' : failedCount > 0 ? 'PARTIAL' : 'SENT';
    return this.prisma.communicationCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount,
        failedCount,
        status,
        sentAt: sentCount > 0 ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        channel: true,
        subject: true,
        status: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
        sentAt: true,
        createdAt: true,
      },
    });
  }

  async getMyMarketingConsent(user: AuthUser) {
    const patient = await this.findPatientConsentRecord(user);
    return {
      marketingEmailConsent: patient.marketingEmailConsent,
      marketingEmailConsentUpdatedAt: patient.marketingEmailConsentUpdatedAt,
      marketingSmsConsent: patient.marketingSmsConsent,
      marketingSmsConsentUpdatedAt: patient.marketingSmsConsentUpdatedAt,
    };
  }

  async updateMyMarketingConsent(
    user: AuthUser,
    input: UpdatePatientMarketingConsentDto,
  ) {
    const patient = await this.findPatientConsentRecord(user);
    const changedAt = new Date();
    return this.prisma.person.update({
      where: { id: patient.id },
      data: {
        marketingEmailConsent: input.marketingEmailConsent,
        ...(input.marketingEmailConsent !== patient.marketingEmailConsent && {
          marketingEmailConsentUpdatedAt: changedAt,
        }),
        marketingSmsConsent: input.marketingSmsConsent,
        ...(input.marketingSmsConsent !== patient.marketingSmsConsent && {
          marketingSmsConsentUpdatedAt: changedAt,
        }),
      },
      select: {
        marketingEmailConsent: true,
        marketingEmailConsentUpdatedAt: true,
        marketingSmsConsent: true,
        marketingSmsConsentUpdatedAt: true,
      },
    });
  }

  private async findPatientConsentRecord(user: AuthUser) {
    if (user.role !== 'patient') {
      throw new ForbiddenException('Only patients can manage their consents');
    }
    const patient = await this.prisma.person.findFirst({
      where: {
        userId: user.id,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'patient' },
      },
      select: {
        id: true,
        marketingEmailConsent: true,
        marketingEmailConsentUpdatedAt: true,
        marketingSmsConsent: true,
        marketingSmsConsentUpdatedAt: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');
    return patient;
  }

  private ensureAdmin(user: AuthUser) {
    if (user.role !== 'admin' && user.role !== 'administrator') {
      throw new ForbiddenException(
        'Only clinic administrators can manage campaigns',
      );
    }
    if (!user.branchId) throw new NotFoundException('Clinic branch not found');
  }
}
