import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';
import { resolvePermissions } from '../shared/auth-profile';

const ACTIVE_SUBSCRIPTION_STATUSES = [
  'TRIAL_ACTIVE',
  'ACTIVE',
  'EXPIRING_SOON',
] as const;
const PAST_DUE_SUBSCRIPTION_STATUSES = ['TRIAL_EXPIRED', 'EXPIRED'] as const;

type AccessTokenPayload = {
  sub?: string;
  jti?: string;
  sid?: string;
  exp?: number;
};

export type AuthenticateRequestInput = {
  token: string;
  path?: string;
};

export class AuthenticateRequestUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute({ token, path }: AuthenticateRequestInput) {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (!payload.sub || !payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid access token');
    }

    const now = new Date();
    const revokedToken = await this.repository.findRevokedAccessToken(
      payload.jti,
    );
    if (revokedToken) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    if (payload.sid) {
      const session = await this.repository.findRefreshSession(payload.sid);
      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        session.expiresAt <= now
      ) {
        throw new UnauthorizedException('Authentication session has ended');
      }
    }

    const profile = await this.repository.findUserProfile(payload.sub);
    if (!profile || !profile.isActive || profile.deletedAt) {
      throw new UnauthorizedException('User account is unavailable');
    }

    const role = profile.Role?.slug ?? 'staff';
    const headquarterId = profile.branch?.headquarterId;
    if (
      role !== 'platform_owner' &&
      (!profile.branch ||
        profile.branch.deletedAt ||
        profile.branch.headquarter.deletedAt ||
        !profile.branch.headquarter.isActive)
    ) {
      throw new UnauthorizedException('Clinic account is unavailable');
    }

    const user: AuthUser = {
      id: profile.id,
      email: profile.email,
      role,
      branchId: profile.branchId ?? '',
      permissions: resolvePermissions(
        role,
        profile.Role?.RolePermission.map(
          (assignment) => assignment.permission.slug,
        ) ?? [],
        profile.UserPermission.map((override) => ({
          slug: override.permission.slug,
          granted: override.granted,
        })),
      ),
    };

    await this.assertSubscriptionAccess(user, headquarterId, path, now);

    return {
      user,
      authToken: {
        jti: payload.jti,
        expiresAt: new Date(payload.exp * 1000),
        sessionId: payload.sid,
      },
    };
  }

  private async assertSubscriptionAccess(
    user: AuthUser,
    headquarterId: string | undefined,
    path: string | undefined,
    now: Date,
  ) {
    if (
      user.role === 'platform_owner' ||
      this.isAccessExempt(path) ||
      !headquarterId
    ) {
      return;
    }

    const activeSubscription =
      await this.repository.findLatestClinicSubscription(headquarterId, [
        ...ACTIVE_SUBSCRIPTION_STATUSES,
      ]);
    const pastDueSubscription = activeSubscription
      ? null
      : await this.repository.findLatestClinicSubscription(headquarterId, [
          ...PAST_DUE_SUBSCRIPTION_STATUSES,
        ]);
    const subscription = activeSubscription ?? pastDueSubscription;

    if (subscription && subscription.expiresAt <= now) {
      throw new ForbiddenException({
        message:
          'The trial or subscription has expired. Choose a plan to restore access.',
        subscriptionRequired: true,
      });
    }
  }

  private isAccessExempt(path: string | undefined) {
    const normalizedPath = (path ?? '').toLowerCase();
    return (
      normalizedPath.startsWith('/auth/') ||
      normalizedPath.startsWith('/subscriptions/') ||
      normalizedPath.startsWith('/admin/subscriptions/') ||
      normalizedPath.startsWith('/assistant/')
    );
  }
}
