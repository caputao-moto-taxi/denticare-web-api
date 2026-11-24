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

export type AuthAccountRecord = {
  id: string;
  email: string;
  deletedAt: Date | null;
  isActive: boolean;
  isEmailVerified: boolean;
  Person: Array<{ firstName: string; lastName: string }>;
};

export type AuthProfileRecord = {
  id: string;
  email: string;
  branchId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  Role: {
    slug: string;
    RolePermission: Array<{ permission: { slug: string } }>;
  } | null;
  UserPermission: Array<{
    granted: boolean;
    permission: { slug: string };
  }>;
  Person: Array<{
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    avatar: string | null;
  }>;
  branch: {
    deletedAt: Date | null;
    headquarterId: string;
    headquarter: { deletedAt: Date | null; isActive: boolean };
  } | null;
};

export type AuthLoginRecord = AuthProfileRecord & {
  password: string;
};

export type AuthActionTokenRecord = {
  id: string;
  userId: string;
  type: string;
  usedAt: Date | null;
  expiresAt: Date;
};

export type AuthRefreshSessionRecord = {
  jti: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
};

export type AuthPlanRecord = {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
};

export type AuthActiveSubscriptionStatus =
  | 'TRIAL_ACTIVE'
  | 'ACTIVE'
  | 'EXPIRING_SOON';

export type AuthSubscriptionStatus =
  | AuthActiveSubscriptionStatus
  | 'TRIAL_EXPIRED'
  | 'EXPIRED'
  | 'CANCELLED';

export type AuthAddressData = {
  street: string;
  city: string;
  country: string;
};

export type AuthHeadquarterData = {
  name: string;
  address: string;
  email: string;
  phone: string;
  nif: string;
  planId: string;
};

export type AuthUserData = {
  email: string;
  password: string;
  username: string;
  branchId: string;
  addressId: string;
  roleId: string;
  isActive: boolean;
  isEmailVerified: boolean;
};

export type AuthPersonData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  branchId: string;
  addressId: string;
  roleId: string;
  userId: string;
};

export type AuthActionTokenData = {
  userId: string;
  type: AuthActionTokenType;
  tokenHash: string;
  expiresAt: Date;
};

export type AuthProfileUserUpdate = {
  email?: string;
  username?: string;
  password?: string;
};

export type AuthProfilePersonUpdate = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
};

export type AuthRefreshSessionData = {
  jti: string;
  userId: string;
  expiresAt: Date;
};

export abstract class IAuthRepository {
  abstract transaction<T>(
    operation: (repository: IAuthRepository) => Promise<T>,
  ): Promise<T>;

  abstract findUserByEmail(email: string): Promise<AuthAccountRecord | null>;
  abstract findUserForLogin(email: string): Promise<AuthLoginRecord | null>;
  abstract findUserProfile(userId: string): Promise<AuthProfileRecord | null>;
  abstract findUserPassword(userId: string): Promise<string | null>;
  abstract findPlans(): Promise<AuthPlanRecord[]>;
  abstract findAuthActionToken(
    tokenHash: string,
  ): Promise<AuthActionTokenRecord | null>;
  abstract findRefreshSession(
    jti: string,
  ): Promise<AuthRefreshSessionRecord | null>;
  abstract findRevokedAccessToken(jti: string): Promise<{ jti: string } | null>;
  abstract findLatestClinicSubscription(
    headquarterId: string,
    statuses: AuthSubscriptionStatus[],
  ): Promise<{ expiresAt: Date } | null>;
  abstract findClinicHeadquarterId(userId: string): Promise<string | null>;
  abstract hasClinicSubscription(
    headquarterId: string,
    statuses: AuthActiveSubscriptionStatus[],
  ): Promise<boolean>;
  abstract findProfileAvatarStorageKey(userId: string): Promise<string | null>;

  abstract upsertRole(input: {
    slug: string;
    name: string;
    description: string;
    isSystem: boolean;
  }): Promise<{ id: string }>;
  abstract createAddress(data: AuthAddressData): Promise<{ id: string }>;
  abstract createHeadquarter(
    data: AuthHeadquarterData,
  ): Promise<{ id: string }>;
  abstract createBranch(data: {
    name: string;
    addressId: string;
    headquarterId: string;
  }): Promise<{ id: string }>;
  abstract createUser(data: AuthUserData): Promise<{ id: string }>;
  abstract createPerson(data: AuthPersonData): Promise<void>;
  abstract createAuthActionToken(data: AuthActionTokenData): Promise<void>;
  abstract claimAuthActionToken(id: string, now: Date): Promise<number>;
  abstract markUnusedAuthActionTokensUsed(
    userId: string,
    type: AuthActionTokenType,
    now: Date,
  ): Promise<void>;
  abstract activateUser(userId: string): Promise<void>;
  abstract createClinicSubscription(data: {
    headquarterId: string;
    status: 'TRIAL_ACTIVE';
    startsAt: Date;
    expiresAt: Date;
  }): Promise<void>;
  abstract updateUserPassword(userId: string, password: string): Promise<void>;
  abstract revokeUserRefreshSessions(userId: string, now: Date): Promise<void>;
  abstract createRefreshSession(data: AuthRefreshSessionData): Promise<void>;
  abstract claimRefreshSession(
    jti: string,
    userId: string,
    now: Date,
  ): Promise<number>;
  abstract updateUserProfile(
    userId: string,
    data: AuthProfileUserUpdate,
  ): Promise<void>;
  abstract updatePersonProfile(
    userId: string,
    data: AuthProfilePersonUpdate,
  ): Promise<void>;
  abstract updateProfileAvatarStorageKey(
    userId: string,
    storageKey: string,
  ): Promise<number>;
  abstract createRevokedToken(jti: string, expiresAt: Date): Promise<void>;
  abstract revokeRefreshSession(
    jti: string,
    userId: string,
    now: Date,
  ): Promise<void>;

  abstract findUserEmailOwner(
    email: string,
    excludedUserId: string,
  ): Promise<{ id: string } | null>;
}
