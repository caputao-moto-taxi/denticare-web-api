import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { XRayAnalysisController } from './x-ray-analysis.controller';
import { XRAY_ANALYSIS_PROVIDERS } from './x-ray-analysis.providers';
import { XRayAiAnalyzer } from './xray-ai-analyzer';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [XRayAnalysisController],
  providers: [
    XRayAiAnalyzer,
    ...Object.values(XRAY_ANALYSIS_PROVIDERS.REPOSITORIES),
    ...Object.values(XRAY_ANALYSIS_PROVIDERS.ADAPTERS),
    ...Object.values(XRAY_ANALYSIS_PROVIDERS.USE_CASES),
  ],
})
export class XRayAnalysisModule {}
