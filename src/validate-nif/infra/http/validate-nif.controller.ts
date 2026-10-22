import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import type { ValidateNifInterface } from '../../application/interface/validateNif.interface';
import { ValidateNifUseCase } from '../../application/useCases/validate-nif.use-case';

@ApiTags('NIF validation')
@Controller('validate-nif')
export class ValidateNifController {
  constructor(private readonly validateNifUseCase: ValidateNifUseCase) {}

  @Post()
  async validate(
    @Body() input: ValidateNifInterface,
    @Res() response: Response,
  ) {
    const result = await this.validateNifUseCase.execute(input);
    return response.status(result.status).json(result.data);
  }
}
