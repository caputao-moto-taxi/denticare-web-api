import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HashModule } from '../shared/application/hash.module';
import { AuthController } from './infra/http/controllers/auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AUTH_PROVIDERS } from './auth.providers';

@Module({
  imports: [
    HashModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET must be configured');
        }
        return {
          secret,
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    ...Object.values(AUTH_PROVIDERS.REPOSITORIES),
    ...Object.values(AUTH_PROVIDERS.USE_CASES),
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [JwtAuthGuard, PermissionsGuard, JwtModule],
})
export class AuthModule {}
