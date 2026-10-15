import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HashModule } from '../shared/application/hash.module';
import { UsersController } from './infra/http/controllers/users.controller';
import { USER_PROVIDERS } from './users.providers';

@Module({
  imports: [AuthModule, HashModule],
  controllers: [UsersController],
  providers: [
    ...Object.values(USER_PROVIDERS.REPOSITORIES),
    ...Object.values(USER_PROVIDERS.USE_CASES),
  ],
})
export class UsersModule {}
