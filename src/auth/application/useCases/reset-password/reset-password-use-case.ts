import { IAuthRepository } from '../../../domain/auth.repository';
import { BadRequestException } from '@nestjs/common';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { hashAuthActionToken } from '../shared/auth-action-token';

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export class ResetPasswordUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: ResetPasswordInput) {
    const now = new Date();
    const action = await this.repository.findAuthActionToken(
      hashAuthActionToken(input.token),
    );
    if (
      !action ||
      action.type !== 'PASSWORD_RESET' ||
      action.usedAt ||
      action.expiresAt <= now
    ) {
      throw new BadRequestException('Invalid or expired password reset link');
    }

    const passwordHash = await this.hashService.hashPassword(input.password);
    await this.repository.transaction(async (transaction) => {
      const claimed = await transaction.claimAuthActionToken(action.id, now);
      if (claimed !== 1) {
        throw new BadRequestException('Invalid or expired password reset link');
      }

      await transaction.updateUserPassword(action.userId, passwordHash);
      await transaction.revokeUserRefreshSessions(action.userId, now);
      await transaction.markUnusedAuthActionTokensUsed(
        action.userId,
        'PASSWORD_RESET',
        now,
      );
    });
  }
}
