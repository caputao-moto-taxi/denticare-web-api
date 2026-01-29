import { Controller, Get, Post, Param, Body, Query, Res } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreatePlanDto } from './dtos/plan-dto';
import {
  CreatePlanUseCase,
  GetPlanUseCase,
  ListPlansUseCase,
} from '../../../application/useCases';

@ApiTags('[PLANS] Module to manage plans.')
@Controller('plans')
export class PlansController {
  constructor(
    private readonly _createPlanUseCase: CreatePlanUseCase,
    private readonly _findPlanByIdUseCase: GetPlanUseCase,
    private readonly _findAllPlansUseCase: ListPlansUseCase,
  ) {}

  @Post()
  async create(@Body() input: CreatePlanDto, @Res() res: Response) {
    const index = await this._createPlanUseCase.execute(input);
    return res.status(index.status).json(index.data);
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('perPage') perPage = 10,
    @Res() res: Response,
  ) {
    const index = await this._findAllPlansUseCase.execute({
      page,
      perPage,
    });
    return res.status(index.status).json(index.data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const index = await this._findPlanByIdUseCase.execute({ id });
    return res.status(index.status).json(index.data);
  }
}
