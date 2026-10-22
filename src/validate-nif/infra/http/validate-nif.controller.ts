import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ValidateNifUseCase } from '../../application/useCases/validate-nif.use-case';

@ApiTags('NIF validation')
@Controller('validate-nif')
export class ValidateNifController {
  constructor(private readonly validateNifUseCase: ValidateNifUseCase) { }

  @Get(':nif')
  @ApiParam({ name: 'nif', description: 'NIF com 10 dígitos' })
  async validate(@Param('nif') nif: string, @Res() response: Response) {
    const result = await this.validateNifUseCase.execute({ nif });
    return response.status(result.status).json(result.data);
  }
}
