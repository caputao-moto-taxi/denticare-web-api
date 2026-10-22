import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { AuthUser } from '../../../../auth/auth-user';
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

  async getSettings(user: AuthUser) {
    this.ensureAdmin(user);
    const branch = await this.prisma.branch.findFirst({
      where: { id: user.branchId, deletedAt: null },
      include: {
        address: true,
        headquarter: true,
      },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    return this.toClinicSettings(branch);
  }

  async updateSettings(user: AuthUser, input: ClinicSettingsUpdateCommand) {
    this.ensureAdmin(user);
    const branch = await this.prisma.branch.findFirst({
      where: { id: user.branchId, deletedAt: null },
      select: { id: true, addressId: true, headquarterId: true },
    });
    if (!branch) throw new NotFoundException('Clinic not found');

    await this.prisma.$transaction(async (transaction) => {
      const headquarterData: Prisma.HeadquarterUpdateInput = {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description.trim() || null,
        }),
        ...(input.nif !== undefined && { nif: input.nif.trim() }),
        ...(input.email !== undefined && { email: input.email.trim() || null }),
        ...(input.phone !== undefined && { phone: input.phone.trim() || null }),
        ...(input.address !== undefined && { address: input.address.trim() }),
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
          data: { name: input.name.trim() },
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
              street: input.address.trim(),
            }),
            ...(input.province !== undefined && {
              province: input.province.trim(),
            }),
            ...(input.city !== undefined && { city: input.city.trim() }),
            ...(input.country !== undefined && {
              country: input.country.trim(),
            }),
          },
        });
      }
    });
    return this.getSettings(user);
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

  async listServices(user: AuthUser) {
    this.ensureAdmin(user);
    const services = await this.prisma.clinicService.findMany({
      where: { branchId: user.branchId, deletedAt: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return services.map((service) => this.toClinicService(service));
  }

  async createService(user: AuthUser, input: ClinicServiceCommand) {
    this.ensureAdmin(user);
    const service = await this.prisma.clinicService.create({
      data: {
        branchId: user.branchId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        price: input.price,
        durationMinutes: input.durationMinutes,
      },
    });
    return this.toClinicService(service);
  }

  async updateService(
    user: AuthUser,
    id: string,
    input: ClinicServiceUpdateCommand,
  ) {
    this.ensureAdmin(user);
    const current = await this.prisma.clinicService.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Clinic service not found');
    const service = await this.prisma.clinicService.update({
      where: { id: current.id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && {
          description: input.description.trim() || null,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.durationMinutes !== undefined && {
          durationMinutes: input.durationMinutes,
        }),
      },
    });
    return this.toClinicService(service);
  }

  async deleteService(user: AuthUser, id: string) {
    this.ensureAdmin(user);
    const current = await this.prisma.clinicService.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Clinic service not found');
    await this.prisma.clinicService.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  async getLogoKey(user: AuthUser) {
    this.ensureAdmin(user);
    const branch = await this.prisma.branch.findFirst({
      where: { id: user.branchId, deletedAt: null },
      select: { headquarter: { select: { logo: true } } },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    return this.normalizeLogoKey(branch.headquarter.logo);
  }

  async getPublicLogoKey(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null, isActive: true },
      select: { headquarter: { select: { logo: true } } },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    const key = this.normalizeLogoKey(branch.headquarter.logo);
    if (!key) throw new NotFoundException('Clinic logo not found');
    return key;
  }

  async updateLogoKey(user: AuthUser, storageKey: string) {
    this.ensureAdmin(user);
    const branch = await this.prisma.branch.findFirst({
      where: { id: user.branchId, deletedAt: null },
      select: { headquarterId: true, headquarter: { select: { logo: true } } },
    });
    if (!branch) throw new NotFoundException('Clinic not found');
    await this.prisma.headquarter.update({
      where: { id: branch.headquarterId },
      data: { logo: storageKey },
    });
    return this.normalizeLogoKey(branch.headquarter.logo);
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

  private normalizeLogoKey(value: string | null) {
    return value?.startsWith('headquarters/') ? value : null;
  }

  private ensureAdmin(user: AuthUser) {
    if (user.role !== 'admin' && user.role !== 'administrator') {
      throw new ForbiddenException(
        'Only clinic administrators can manage settings',
      );
    }
  }
}
