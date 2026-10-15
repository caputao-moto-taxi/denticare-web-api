import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { XRayAnalysisController } from './x-ray-analysis.controller';
import { XRayAnalysisService } from './x-ray-analysis.service';
import { XRayAiAnalyzer } from './xray-ai-analyzer';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [XRayAnalysisController],
  providers: [XRayAnalysisService, XRayAiAnalyzer],
})
export class XRayAnalysisModule {}
