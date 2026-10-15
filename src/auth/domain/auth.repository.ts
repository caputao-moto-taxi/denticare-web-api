import { AuthenticatedRequest, AuthUser } from '../auth-user';
export type RegisterCommand = {
  clinicName: string;
  taxId: string;
  clinicPhone: string;
  clinicEmail: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  password: string;
};

export type LoginCommand = { email: string; password: string };
export type UpdateProfileCommand = {
  email?: string;
  name?: string;
  phone?: string;
};

export abstract class IAuthRepository {
  abstract register(input: RegisterCommand): Promise<unknown>;
  abstract login(input: LoginCommand): Promise<unknown>;
  abstract getProfile(user: AuthUser): Promise<unknown>;
  abstract updateProfile(
    user: AuthUser,
    input: UpdateProfileCommand,
  ): Promise<unknown>;
  abstract logout(
    userId: string,
    jti: AuthenticatedRequest['authToken']['jti'],
    expiresAt: AuthenticatedRequest['authToken']['expiresAt'],
  ): Promise<void>;
}
