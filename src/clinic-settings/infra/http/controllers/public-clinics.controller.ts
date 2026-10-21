import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  GetPublicClinicUseCase,
  ManageClinicLogoUseCase,
} from '../../../application/useCases/clinic-settings.use-cases';

@ApiTags('Public clinics')
@Controller('public/clinics')
export class PublicClinicsController {
  constructor(
    private readonly getPublicClinic: GetPublicClinicUseCase,
    private readonly manageLogo: ManageClinicLogoUseCase,
  ) {}

  @Get(':branchId')
  get(@Param('branchId') branchId: string) {
    return this.getPublicClinic.execute(branchId);
  }

  @Get(':branchId/logo')
  async getLogo(
    @Param('branchId') branchId: string,
    @Res() response: Response,
  ) {
    const file = await this.manageLogo.getPublic(branchId);
    response.setHeader(
      'Content-Type',
      file.mime_type ?? 'application/octet-stream',
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Content-Length', file.data.byteLength);
    return response.send(file.data);
  }
}
