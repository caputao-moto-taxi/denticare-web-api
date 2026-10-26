import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { CommunicationsRepository } from '../../../domain/communications.repository';
import {
  CampaignAudiencePatient,
  CampaignChannel,
  CampaignRecipient,
  CampaignStatus,
  CampaignSummary,
  PatientMarketingConsent,
  UpdateMarketingConsentCommand,
} from '../../../domain/communications.types';

const campaignSummarySelect = {
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
};

@Injectable()
export class CommunicationsPrismaRepository extends CommunicationsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  listCampaigns(branchId: string): Promise<CampaignSummary[]> {
    return this.prisma.communicationCampaign.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: campaignSummarySelect,
    });
  }

  listAudience(
    branchId: string,
    channel: CampaignChannel,
    search?: string,
  ): Promise<CampaignAudiencePatient[]> {
    return this.prisma.person.findMany({
      where: {
        branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'patient' },
        ...(channel === 'EMAIL'
          ? { marketingEmailConsent: true }
          : { marketingSmsConsent: true }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search } },
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
  }

  findCampaignRecipients(
    branchId: string,
    channel: CampaignChannel,
    recipientIds: string[],
  ): Promise<CampaignRecipient[]> {
    return this.prisma.person.findMany({
      where: {
        id: { in: recipientIds },
        branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'patient' },
        ...(channel === 'EMAIL'
          ? { marketingEmailConsent: true }
          : { marketingSmsConsent: true }),
      },
      select: { id: true, email: true, phoneNumber: true },
    });
  }

  createCampaign(input: {
    branchId: string;
    createdById: string;
    name: string;
    channel: CampaignChannel;
    subject: string | null;
    body: string;
    recipientCount: number;
  }): Promise<{ id: string }> {
    return this.prisma.communicationCampaign.create({
      data: input,
      select: { id: true },
    });
  }

  updateCampaignResult(
    id: string,
    result: {
      sentCount: number;
      failedCount: number;
      status: CampaignStatus;
      sentAt: Date | null;
    },
  ): Promise<CampaignSummary> {
    return this.prisma.communicationCampaign.update({
      where: { id },
      data: result,
      select: campaignSummarySelect,
    });
  }

  findPatientConsent(
    userId: string,
    branchId: string,
  ): Promise<PatientMarketingConsent | null> {
    return this.prisma.person.findFirst({
      where: {
        userId,
        branchId,
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
  }

  async updatePatientConsent(
    id: string,
    input: UpdateMarketingConsentCommand,
  ): Promise<Omit<PatientMarketingConsent, 'id'>> {
    return this.prisma.person.update({
      where: { id },
      data: input,
      select: {
        marketingEmailConsent: true,
        marketingEmailConsentUpdatedAt: true,
        marketingSmsConsent: true,
        marketingSmsConsentUpdatedAt: true,
      },
    });
  }
}
