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
export type AuthActionEmail = {
  email: string;
  displayName: string;
  token: string;
};
export type AuthActionTokenType = 'ACTIVATION' | 'PASSWORD_RESET';
export type RefreshCommand = { refreshToken: string };
export type UpdateProfileCommand = {
  email?: string;
  name?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
};

export abstract class IAuthRepository {
  abstract register(input: RegisterCommand): Promise<AuthActionEmail>;
  abstract createActivationRequest(
    email: string,
  ): Promise<AuthActionEmail | null>;
  abstract activateAccount(token: string): Promise<void>;
  abstract createPasswordResetRequest(
    email: string,
  ): Promise<AuthActionEmail | null>;
  abstract resetPassword(token: string, password: string): Promise<void>;
  abstract login(input: LoginCommand): Promise<unknown>;
  abstract refresh(input: RefreshCommand): Promise<unknown>;
  abstract getProfile(user: AuthUser): Promise<unknown>;
  abstract updateProfile(
    user: AuthUser,
    input: UpdateProfileCommand,
  ): Promise<unknown>;
  abstract getProfileAvatarStorageKey(user: AuthUser): Promise<string | null>;
  abstract updateProfileAvatarStorageKey(
    user: AuthUser,
    storageKey: string,
  ): Promise<void>;
  abstract logout(
    userId: string,
    jti: AuthenticatedRequest['authToken']['jti'],
    expiresAt: AuthenticatedRequest['authToken']['expiresAt'],
    sessionId?: AuthenticatedRequest['authToken']['sessionId'],
  ): Promise<void>;
}
