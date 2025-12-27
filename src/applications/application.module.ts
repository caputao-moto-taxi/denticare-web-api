import { Module } from '@nestjs/common';
import { APPLICATION_PROVIDERS } from './application.providers';
import { ApplicationController } from './infra/http/controllers/applicationControllers';

@Module({
  imports: [],
  controllers: [ApplicationController],
  providers: [
    ...Object.values(APPLICATION_PROVIDERS.REPOSITORIES),
    ...Object.values(APPLICATION_PROVIDERS.USE_CASES),
  ],
  exports: [APPLICATION_PROVIDERS.REPOSITORIES.APPLICATION_REPOSITORY.provide],
})
export class ApplicationModule {}
