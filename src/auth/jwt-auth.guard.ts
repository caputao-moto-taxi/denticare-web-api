import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AuthenticatedRequest } from './auth-user';
import { resolvePermissions } from './permissions';

interface AccessTokenPayload {
  sub: string;
  jti: string;
  sid?: string;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer access token is required');
    }

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
    const [revoked, session] = await Promise.all([
      this.prisma.revokedToken.findUnique({
        where: { jti: payload.jti },
        select: { jti: true },
      }),
      payload.sid
        ? this.prisma.refreshToken.findFirst({
            where: {
              jti: payload.sid,
              userId: payload.sub,
              revokedAt: null,
              expiresAt: { gt: now },
            },
            select: { jti: true },
          })
        : Promise.resolve(null),
    ]);
    if (revoked) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    if (payload.sid && !session) {
      throw new UnauthorizedException('Authentication session has ended');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        deletedAt: null,
      },
      include: {
        Role: {
          include: {
            RolePermission: {
              where: { deletedAt: null },
              include: { permission: { select: { slug: true } } },
            },
          },
        },
        UserPermission: {
          where: { deletedAt: null },
          include: { permission: { select: { slug: true } } },
        },
        branch: {
          select: {
            headquarterId: true,
            deletedAt: true,
            headquarter: { select: { deletedAt: true, isActive: true } },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }
    if (
      user.Role?.slug !== 'platform_owner' &&
      (!user.branch ||
        user.branch.deletedAt ||
        user.branch.headquarter.deletedAt ||
        !user.branch.headquarter.isActive)
    ) {
      throw new UnauthorizedException('Clinic account is unavailable');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.Role?.slug ?? 'staff',
      branchId: user.branchId ?? '',
      permissions: resolvePermissions(
        user.Role?.slug ?? 'staff',
        user.Role?.RolePermission.map(
          (assignment) => assignment.permission.slug,
        ) ?? [],
        user.UserPermission.map((override) => ({
          slug: override.permission.slug,
          granted: override.granted,
        })),
      ),
    };
    request.authToken = {
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
      sessionId: payload.sid,
    };

    await this.assertSubscriptionAccess(request, user.branch?.headquarterId);

    return true;
  }

  private async assertSubscriptionAccess(
    request: AuthenticatedRequest,
    headquarterId?: string,
  ) {
    if (
      request.user.role === 'platform_owner' ||
      this.isAccessExempt(request.path)
    ) {
      return;
    }
    if (!headquarterId) return;

    const activeSubscription = await this.prisma.clinicSubscription.findFirst({
      where: {
        headquarterId,
        status: { in: ['TRIAL_ACTIVE', 'ACTIVE', 'EXPIRING_SOON'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { expiresAt: true },
    });
    const pastDueSubscription = activeSubscription
      ? null
      : await this.prisma.clinicSubscription.findFirst({
          where: {
            headquarterId,
            status: { in: ['TRIAL_EXPIRED', 'EXPIRED'] },
          },
          orderBy: { createdAt: 'desc' },
          select: { expiresAt: true },
        });
    const subscription = activeSubscription ?? pastDueSubscription;
    if (subscription && subscription.expiresAt <= new Date()) {
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
