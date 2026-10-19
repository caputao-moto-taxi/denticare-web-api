import { XRayAnalysisResult, XRayType } from './x-ray-analysis.entity';

export interface IXRayAnalyzer {
  analyze(
    image: Buffer,
    mimeType: 'image/jpeg' | 'image/png',
    type: XRayType,
    region: string,
  ): Promise<{ result: XRayAnalysisResult; modelName: string }>;
}
