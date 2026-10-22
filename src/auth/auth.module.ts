import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HashModule } from '../shared/application/hash.module';
import { AuthController } from './infra/http/controllers/auth.controller';
import { AuthEmailService } from './domain/auth-email.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AUTH_PROVIDERS } from './auth.providers';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';

@Module({
  imports: [
    HashModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET must be configured');
        }
        if (!process.env.JWT_REFRESH_SECRET) {
          throw new Error('JWT_REFRESH_SECRET must be configured');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    ...Object.values(AUTH_PROVIDERS.REPOSITORIES),
    ...Object.values(AUTH_PROVIDERS.SERVICES),
    ...Object.values(AUTH_PROVIDERS.USE_CASES),
    PatientExamStorage,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [JwtAuthGuard, PermissionsGuard, JwtModule, AuthEmailService],
})
export class AuthModule {}
