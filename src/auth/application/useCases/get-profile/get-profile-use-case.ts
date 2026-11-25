import { UnauthorizedException } from '@nestjs/common';
import { AuthUser } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';
import { toPublicAuthProfile } from '../shared/auth-profile';

export type GetProfileInput = { user: AuthUser };

export class GetProfileUseCase {
  constructor(private readonly repository: IAuthRepository) {}

  async execute({ user }: GetProfileInput) {
    const profile = await this.repository.findUserProfile(user.id);
    if (!profile) {
      throw new UnauthorizedException('User account is unavailable');
    }

    return toPublicAuthProfile(profile);
  }
}
