import { Logger } from '@nestjs/common';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { ReadHTMLFile } from '../../../../shared/helpers/utils';
import { SendMailServiceUseCase } from '../../../../shared/infra/services/sendEmailNotification.service';
import {
  RegisterCommand,
  IAuthRepository,
} from '../../../domain/auth.repository';
import { DuplicateAuthEmailError } from '../../../domain/auth.errors';
import { generateAuthActionToken } from '../shared/auth-action-token';

export type RegisterInput = { input: RegisterCommand };

const ACTIVATION_TOKEN_TTL_MILLISECONDS = 24 * 60 * 60 * 1000;

export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly repository: IAuthRepository,
    private readonly sendMailService: SendMailServiceUseCase,
    private readonly hashService: IHashService,
  ) {}

  async execute({ input }: RegisterInput) {
    const email = input.adminEmail.trim().toLowerCase();
    const existingAccount = await this.repository.findUserByEmail(email);
    if (existingAccount && !existingAccount.deletedAt) {
      throw new ConflictException('An account with this email already exists');
    }

    const plan = (await this.repository.findPlans())
      .filter((candidate) => candidate.deletedAt === null)
      .sort(
        (first, second) =>
          first.createdAt.getTime() - second.createdAt.getTime(),
      )[0];
    if (!plan) {
      throw new ServiceUnavailableException(
        'Clinic registration is unavailable because no subscription plan is configured',
      );
    }

    const displayName = input.adminName.trim().replace(/\s+/g, ' ');
    const [firstName, ...lastNameParts] = displayName.split(' ');
    const activationToken = generateAuthActionToken();
    const now = new Date();
    const password = await this.hashService.hashPassword(input.password);
    const clinicEmail = input.clinicEmail.trim().toLowerCase();

    try {
      await this.repository.transaction(async (transaction) => {
        const adminRole = await transaction.upsertRole({
          name: 'Administrator',
          slug: 'admin',
          description: 'Clinic administrator',
          isSystem: true,
        });
        const address = await transaction.createAddress({
          street: input.address.trim(),
          city: 'Not specified',
          country: 'Angola',
        });
        const headquarter = await transaction.createHeadquarter({
          name: input.clinicName.trim(),
          address: input.address.trim(),
          email: clinicEmail,
          phone: input.clinicPhone.trim(),
          nif: input.taxId.trim(),
          planId: plan.id,
        });
        const branch = await transaction.createBranch({
          name: input.clinicName.trim(),
          addressId: address.id,
          headquarterId: headquarter.id,
        });
        const user = await transaction.createUser({
          email,
          password,
          username: email,
          branchId: branch.id,
          addressId: address.id,
          roleId: adminRole.id,
          isActive: false,
          isEmailVerified: false,
        });
        await transaction.createPerson({
          firstName,
          lastName: lastNameParts.join(' ') || firstName,
          email,
          phoneNumber: input.adminPhone.trim(),
          branchId: branch.id,
          addressId: address.id,
          roleId: adminRole.id,
          userId: user.id,
        });
        await transaction.createAuthActionToken({
          userId: user.id,
          type: 'ACTIVATION',
          tokenHash: activationToken.tokenHash,
          expiresAt: new Date(
            now.getTime() + ACTIVATION_TOKEN_TTL_MILLISECONDS,
          ),
        });
      });
    } catch (error) {
      if (error instanceof DuplicateAuthEmailError) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }

    let emailSent = true;
    try {
      const templatePath = [
        join(__dirname, '../../../../../public/activation-email.html'),
        join(__dirname, '../../../../public/activation-email.html'),
      ].find(existsSync);

      if (!templatePath) {
        throw new Error('Activation email template not found');
      }

      const activationUrl = new URL(
        '/auth/activate',
        (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
          /\/$/,
          '',
        ),
      );
      activationUrl.searchParams.set('token', activationToken.token);

      const subject = 'Ative a sua conta DentCare';
      const html = await ReadHTMLFile(templatePath, {
        displayName,
        activationUrl: activationUrl.toString(),
        year: new Date().getFullYear(),
      });

      const result = await this.sendMailService.execute({
        to: email,
        subject,
        html,
      });

      if (result !== true) {
        emailSent = false;
        this.logger.warn('Activation email delivery failed after registration');
      }
    } catch (error) {
      emailSent = false;
      this.logger.warn(
        `Activation email delivery failed after registration: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { message: 'Check your email to activate your account.', emailSent };
  }
}
