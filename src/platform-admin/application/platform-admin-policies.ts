import { BadRequestException } from '@nestjs/common';
import { PlatformClinicUpdateChanges } from '../domain/platform-admin.repository';
import { UpdatePlatformClinicDto } from '../infra/http/platform-admin.dto';

export function clinicUpdateChanges(input: UpdatePlatformClinicDto) {
  const changes: PlatformClinicUpdateChanges = {};
  if (input.name !== undefined) changes.name = input.name.trim();
  if (input.address !== undefined) changes.address = input.address.trim();
  if (input.email !== undefined) changes.email = input.email?.trim() || null;
  if (input.phone !== undefined) changes.phone = input.phone?.trim() || null;
  if (input.nif !== undefined) changes.nif = input.nif.trim();
  if (input.description !== undefined) {
    changes.description = input.description?.trim() || null;
  }
  if (!Object.keys(changes).length) {
    throw new BadRequestException('At least one clinic field must be provided');
  }
  return changes;
}
