import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res
} from '@nestjs/common';

import {
  CreateApplicationUseCase,
} from '../../../app/useCases/create-application';
import { ApiTags } from '@nestjs/swagger';
import { DeleteApplicationUseCase, GetApplicationUseCase, ListApplicationUseCase, UpdateApplicationUseCase, UpdateApplicationInput } from '../../../app/useCases';
import { CreateApplicationDto } from './dto/applicationDto';
import { Response } from 'express';


@ApiTags('[APPLICATIONS] Module to save and manage applications.')
@Controller('application')
export class ApplicationController {
  constructor(
    private readonly createApplicationUseCase: CreateApplicationUseCase,
    private readonly updateApplicationUseCase: UpdateApplicationUseCase,
    private readonly deleteApplicationUseCase: DeleteApplicationUseCase,
    private readonly findApplicationByIdUseCase: GetApplicationUseCase,
    private readonly findAllApplicationUseCase: ListApplicationUseCase,
  ) {}

  @Post()
  async create(@Body() input: CreateApplicationDto, @Res() res: Response) {
    const index = await this.createApplicationUseCase.execute(input);
    return res.status(index.status).json(index.data);
  }

  @Get()
  async findAll(@Query('page') page = 1, @Query('perPage') perPage = 10, @Res() res: Response) {
    const index = await this.findAllApplicationUseCase.execute({
      page,
      perPage,
    });
    return res.status(index.status).json(index.data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const index = await this.findApplicationByIdUseCase.execute({ id });
    return res.status(index.status).json(index.data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() input: Partial<UpdateApplicationInput>,
    @Res() re: Response
  ) {
    const index = await this.updateApplicationUseCase.execute({
      id,
      ...input,
    });
    return re.status(index.status).json(index.data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Res() res: Response) {
    await this.deleteApplicationUseCase.execute({ id });
    return res.json({ message: `Application with ID ${id} has been deleted.` });
  }
}
