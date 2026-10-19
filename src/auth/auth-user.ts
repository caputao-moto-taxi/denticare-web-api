export interface AuthUser {
  id: string;
  email: string;
  role: string;
  branchId: string;
  permissions?: string[];
}

export interface AuthenticatedRequest {
  user: AuthUser;
  authToken: {
    jti: string;
    expiresAt: Date;
    sessionId?: string;
  };
  headers: {
    authorization?: string;
    [key: string]: unknown;
  };
  ip?: string;
}
