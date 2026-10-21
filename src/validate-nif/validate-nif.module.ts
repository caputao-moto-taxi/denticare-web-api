import { Module } from '@nestjs/common';
import { ValidateNifUseCase } from './application/useCases/validate-nif.use-case';
import { ValidateNifController } from './infra/http/validate-nif.controller';

@Module({
  controllers: [ValidateNifController],
  providers: [ValidateNifUseCase],
})
export class ValidateNifModule {}
