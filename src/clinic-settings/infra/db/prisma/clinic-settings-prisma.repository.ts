import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  ClinicServiceCommand,
  ClinicServiceUpdateCommand,
  ClinicSettingsUpdateCommand,
  IClinicSettingsRepository,
} from '../../../domain/clinic-settings.repository';

@Injectable()
export class ClinicSettingsPrismaRepository extends IClinicSettingsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSettings(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      include: {
        address: true,
        headquarter: true,
      },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    return this.toClinicSettings(branch);
  }

  async updateSettings(branchId: string, input: ClinicSettingsUpdateCommand) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { id: true, addressId: true, headquarterId: true },
    });
    if (!branch) throw new NotFoundException('Clinic not found');

    await this.prisma.$transaction(async (transaction) => {
      const headquarterData: Prisma.HeadquarterUpdateInput = {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description || null,
        }),
        ...(input.nif !== undefined && { nif: input.nif }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.phone !== undefined && { phone: input.phone || null }),
        ...(input.address !== undefined && { address: input.address }),
      };
      if (Object.keys(headquarterData).length > 0) {
        await transaction.headquarter.update({
          where: { id: branch.headquarterId },
          data: headquarterData,
        });
      }
      if (input.name !== undefined) {
        await transaction.branch.update({
          where: { id: branch.id },
          data: { name: input.name },
        });
      }
      if (
        input.address !== undefined ||
        input.province !== undefined ||
        input.city !== undefined ||
        input.country !== undefined
      ) {
        await transaction.address.update({
          where: { id: branch.addressId },
          data: {
            ...(input.address !== undefined && {
              street: input.address,
            }),
            ...(input.province !== undefined && {
              province: input.province,
            }),
            ...(input.city !== undefined && { city: input.city }),
            ...(input.country !== undefined && { country: input.country }),
          },
        });
      }
    });
    return this.getSettings(branchId);
  }

  async getPublicClinic(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null, isActive: true },
      include: {
        address: true,
        headquarter: true,
        clinicServices: {
          where: { deletedAt: null },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    return {
      id: branch.id,
      name: branch.headquarter.name,
      description: branch.headquarter.description ?? '',
      email: branch.headquarter.email ?? '',
      phone: branch.headquarter.phone ?? '',
      address: branch.headquarter.address || branch.address.street,
      city: branch.address.city,
      country: branch.address.country,
      logoUrl: branch.headquarter.logo?.startsWith('headquarters/')
        ? `/public/clinics/${branch.id}/logo`
        : null,
      services: branch.clinicServices.map((service) =>
        this.toClinicService(service),
      ),
    };
  }

  async listServices(branchId: string) {
    const services = await this.prisma.clinicService.findMany({
      where: { branchId, deletedAt: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return services.map((service) => this.toClinicService(service));
  }

  async createService(branchId: string, input: ClinicServiceCommand) {
    const service = await this.prisma.clinicService.create({
      data: {
        branchId,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        durationMinutes: input.durationMinutes,
      },
    });
    return this.toClinicService(service);
  }

  async updateService(
    branchId: string,
    id: string,
    input: ClinicServiceUpdateCommand,
  ) {
    const current = await this.prisma.clinicService.findFirst({
      where: { id, branchId, deletedAt: null },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Clinic service not found');
    const service = await this.prisma.clinicService.update({
      where: { id: current.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description || null,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.durationMinutes !== undefined && {
          durationMinutes: input.durationMinutes,
        }),
      },
    });
    return this.toClinicService(service);
  }

  async deleteService(branchId: string, id: string) {
    const current = await this.prisma.clinicService.findFirst({
      where: { id, branchId, deletedAt: null },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Clinic service not found');
    await this.prisma.clinicService.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  async getLogoKey(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { headquarter: { select: { logo: true } } },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    return branch.headquarter.logo;
  }

  async getPublicLogoKey(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null, isActive: true },
      select: { headquarter: { select: { logo: true } } },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    return branch.headquarter.logo;
  }

  async updateLogoKey(branchId: string, storageKey: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { headquarterId: true },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    await this.prisma.headquarter.update({
      where: { id: branch.headquarterId },
      data: { logo: storageKey },
    });
  }

  private toClinicSettings(branch: {
    id: string;
    name: string;
    address: {
      street: string;
      province: string | null;
      city: string;
      country: string;
    };
    headquarter: {
      name: string;
      description: string | null;
      email: string | null;
      phone: string | null;
      nif: string;
      address: string;
      logo: string | null;
    };
  }) {
    return {
      branchId: branch.id,
      name: branch.headquarter.name,
      description: branch.headquarter.description ?? '',
      email: branch.headquarter.email ?? '',
      phone: branch.headquarter.phone ?? '',
      nif: branch.headquarter.nif,
      address: branch.address.street || branch.headquarter.address,
      province: branch.address.province ?? '',
      city: branch.address.city,
      country: branch.address.country,
      logoUrl: branch.headquarter.logo?.startsWith('headquarters/')
        ? '/clinic/settings/logo'
        : null,
    };
  }

  private toClinicService(service: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    durationMinutes: number;
  }) {
    return {
      id: service.id,
      name: service.name,
      description: service.description ?? '',
      price: service.price,
      durationMinutes: service.durationMinutes,
    };
  }
}
