import {
  CanActivate,
  ExecutionContext,
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

    const revoked = await this.prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
      select: { jti: true },
    });
    if (revoked) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    if (payload.sid) {
      const session = await this.prisma.refreshToken.findFirst({
        where: {
          jti: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { jti: true },
      });
      if (!session) {
        throw new UnauthorizedException('Authentication session has ended');
      }
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
      },
    });
    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.Role?.slug ?? 'staff',
      branchId: user.branchId,
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

    return true;
  }
}
