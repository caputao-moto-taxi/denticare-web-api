import { AuthActionEmail } from './auth.repository';

export abstract class AuthEmailService {
  abstract assertConfigured(): void;
  abstract sendActivationEmail(input: AuthActionEmail): Promise<void>;
  abstract sendPasswordResetEmail(input: AuthActionEmail): Promise<void>;
}
