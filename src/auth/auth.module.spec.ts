import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ChatModule } from '../chat/chat.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { PatientsModule } from '../patients/patients.module';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: ConfigService, useValue: { get: jest.fn() } },
  ],
  exports: [PrismaService, ConfigService],
})
class TestDatabaseModule {}

describe('AuthModule dependency visibility', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'auth-module-test-secret';
    process.env.JWT_REFRESH_SECRET = 'auth-module-refresh-test-secret';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
    if (originalRefreshSecret === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    }
  });

  it.each([PatientsModule, DoctorsModule, AppointmentsModule, ChatModule])(
    'resolves the JWT guard in %p',
    async (featureModule) => {
      const module = await Test.createTestingModule({
        imports: [TestDatabaseModule, featureModule],
      }).compile();

      try {
        expect(module.get(JwtAuthGuard)).toBeInstanceOf(JwtAuthGuard);
        const jwt = module.get(JwtService);
        const token = await jwt.signAsync({ sub: 'test-user' });
        await expect(jwt.verifyAsync(token)).resolves.toMatchObject({
          sub: 'test-user',
          exp: expect.any(Number),
        });
      } finally {
        await module.close();
      }
    },
  );
});
