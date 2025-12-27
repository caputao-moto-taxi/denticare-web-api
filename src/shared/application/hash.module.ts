import { Module } from '@nestjs/common';
import { HashService } from './hash.service';

@Module({
  providers: [
    {
      provide: 'IHashService',
      useClass: HashService,
    },
    HashService,
  ],
  exports: ['IHashService'],
})
export class HashModule {}
