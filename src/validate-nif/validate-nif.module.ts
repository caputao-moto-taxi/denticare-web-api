import { Module } from '@nestjs/common';
import { ValidateNifUseCase } from './application/useCases/validate-nif.use-case';
import { ValidateNifController } from './infra/http/validate-nif.controller';
import { INifVerificationProvider } from './application/interface/nif-verification.provider';
import { DominiosAoNifProvider } from './infra/http/domains-ao-nif.provider';

@Module({
  controllers: [ValidateNifController],
  providers: [
    DominiosAoNifProvider,
    {
      provide: INifVerificationProvider,
      useExisting: DominiosAoNifProvider,
    },
    {
      provide: ValidateNifUseCase,
      useFactory: (provider: INifVerificationProvider) =>
        new ValidateNifUseCase(provider),
      inject: [INifVerificationProvider],
    },
  ],
})
export class ValidateNifModule {}
