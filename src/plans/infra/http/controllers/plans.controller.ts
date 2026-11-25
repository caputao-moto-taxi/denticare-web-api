import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { PlatformOwnerGuard } from '../../../../subscriptions/infra/http/platform-owner.guard';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import {
  AddPlanBenefitDto,
  CreatePlanDto,
  UpdatePlanDto,
  UpdatePlanPromotionDto,
} from './dtos/plan-dto';
import {
  CreatePlanUseCase,
  AddPlanBenefitUseCase,
  DeletePlanUseCase,
  GetPlanUseCase,
  ListPlanCurrenciesUseCase,
  ListPlansUseCase,
  UpdatePlanUseCase,
  UpdatePlanPromotionUseCase,
} from '../../../application/useCases';

@ApiTags('[PLANS] Module to manage plans.')
@Controller('plans')
export class PlansController {
  constructor(
    private readonly _createPlanUseCase: CreatePlanUseCase,
    private readonly _findPlanByIdUseCase: GetPlanUseCase,
    private readonly _findAllPlansUseCase: ListPlansUseCase,
    private readonly _deletePlanUseCase: DeletePlanUseCase,
    private readonly _updatePlanUseCase: UpdatePlanUseCase,
    private readonly _addPlanBenefitUseCase: AddPlanBenefitUseCase,
    private readonly _updatePlanPromotionUseCase: UpdatePlanPromotionUseCase,
    private readonly _listPlanCurrenciesUseCase: ListPlanCurrenciesUseCase,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformOwnerGuard)
  @Post()
  async create(@Body() input: CreatePlanDto, @Res() res: Response) {
    const index = await this._createPlanUseCase.execute(input);
    return res.status(index.status).json(index.data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformOwnerGuard)
  @Patch(':id/promotion')
  async updatePromotion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePlanPromotionDto,
    @Res() res: Response,
  ) {
    const index = await this._updatePlanPromotionUseCase.execute({
      id,
      ...input,
    });
    return res.status(index.status).json(index.data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformOwnerGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePlanDto,
    @Res() res: Response,
  ) {
    const index = await this._updatePlanUseCase.execute({ id, ...input });
    return res.status(index.status).json(index.data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformOwnerGuard)
  @Post(':id/benefits')
  async addBenefit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AddPlanBenefitDto,
    @Res() res: Response,
  ) {
    const index = await this._addPlanBenefitUseCase.execute({
      planId: id,
      ...input,
    });
    return res.status(index.status).json(index.data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformOwnerGuard)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const index = await this._deletePlanUseCase.execute({ id });
    return res.status(index.status).json(index.data);
  }

  @Get()
  async findAll(@Query() query: ListQueryDto, @Res() res: Response) {
    const index = await this._findAllPlansUseCase.execute(query);
    return res.status(index.status).json(index.data);
  }

  @Get('currencies')
  async findCurrencies(@Res() res: Response) {
    const index = await this._listPlanCurrenciesUseCase.execute();
    return res.status(index.status).json(index.data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const index = await this._findPlanByIdUseCase.execute({ id });
    return res.status(index.status).json(index.data);
  }
}
