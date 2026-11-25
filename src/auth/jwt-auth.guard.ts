import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from './auth-user';
import { AuthenticateRequestUseCase } from './application/useCases/authenticate-request/authenticate-request-use-case';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authenticateRequest: AuthenticateRequestUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer access token is required');
    }

    const authentication = await this.authenticateRequest.execute({
      token,
      path: request.path,
    });
    request.user = authentication.user;
    request.authToken = authentication.authToken;

    return true;
  }
}
