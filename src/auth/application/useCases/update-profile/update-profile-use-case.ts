import { BadRequestException, ConflictException } from '@nestjs/common';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { AuthUser } from '../../../auth-user';
import {
  IAuthRepository,
  UpdateProfileCommand,
} from '../../../domain/auth.repository';
import { DuplicateAuthEmailError } from '../../../domain/auth.errors';
import { toPublicAuthProfile } from '../shared/auth-profile';

export type UpdateProfileInput = {
  user: AuthUser;
  input: UpdateProfileCommand;
};

export class UpdateProfileUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute({ user, input }: UpdateProfileInput) {
    let passwordHash: string | undefined;
    if (input.newPassword !== undefined) {
      if (!input.currentPassword) {
        throw new BadRequestException('Current password is incorrect');
      }
      const currentPasswordHash = await this.repository.findUserPassword(
        user.id,
      );
      if (
        !currentPasswordHash ||
        !(await this.hashService.compare(
          input.currentPassword,
          currentPasswordHash,
        ))
      ) {
        throw new BadRequestException('Current password is incorrect');
      }
      passwordHash = await this.hashService.hashPassword(input.newPassword);
    }

    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email) {
      const existing = await this.repository.findUserEmailOwner(email, user.id);
      if (existing) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
    }

    const normalizedName = input.name?.trim().replace(/\s+/g, ' ');
    if (input.name !== undefined && !normalizedName) {
      throw new BadRequestException('Name cannot be empty');
    }
    const [firstName, ...lastNameParts] = normalizedName?.split(' ') ?? [];
    const userUpdate = {
      ...(email && { email, username: email }),
      ...(passwordHash && { password: passwordHash }),
    };
    const personUpdate = {
      ...(normalizedName && {
        firstName,
        lastName: lastNameParts.join(' ') || firstName,
      }),
      ...(email && { email }),
      ...(input.phone !== undefined && {
        phoneNumber: input.phone.trim(),
      }),
    };

    try {
      await this.repository.transaction(async (transaction) => {
        if (Object.keys(userUpdate).length > 0) {
          await transaction.updateUserProfile(user.id, userUpdate);
        }
        if (Object.keys(personUpdate).length > 0) {
          await transaction.updatePersonProfile(user.id, personUpdate);
        }
      });
    } catch (error) {
      if (error instanceof DuplicateAuthEmailError) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }

    const profile = await this.repository.findUserProfile(user.id);
    if (!profile) {
      throw new BadRequestException('User profile is unavailable');
    }
    return toPublicAuthProfile(profile);
  }
}
