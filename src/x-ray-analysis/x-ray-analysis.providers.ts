import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { PatientExamStorage } from '../patients/infra/storage/patient-exam-storage';
import { CreateXRayAnalysisUseCase } from './application/useCases/create-x-ray-analysis/create-x-ray-analysis-use-case';
import { GetXRayAnalysisFileUseCase } from './application/useCases/get-x-ray-analysis-file/get-x-ray-analysis-file-use-case';
import { ListXRayAnalysesUseCase } from './application/useCases/list-x-ray-analyses/list-x-ray-analyses-use-case';
import { IXRayAnalysisRepository } from './domain/x-ray-analysis.repository';
import { IXRayAnalyzer } from './domain/x-ray-analyzer.interface';
import { IXRayFileStorage } from './domain/x-ray-file-storage.interface';
import { XRayAnalysisPrismaRepository } from './infra/db/prisma/x-ray-analysis-prisma.repository';
import { XRayAiAnalyzer } from './xray-ai-analyzer';

const REPOSITORIES = {
  XRAY_ANALYSIS_REPOSITORY: {
    provide: 'XRayAnalysisRepository',
    useExisting: XRayAnalysisPrismaRepository,
  },
  XRAY_ANALYSIS_PRISMA_REPOSITORY: {
    provide: XRayAnalysisPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new XRayAnalysisPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  LIST: {
    provide: ListXRayAnalysesUseCase,
    useFactory: (repository: IXRayAnalysisRepository) =>
      new ListXRayAnalysesUseCase(repository),
    inject: [REPOSITORIES.XRAY_ANALYSIS_REPOSITORY.provide],
  },
  CREATE: {
    provide: CreateXRayAnalysisUseCase,
    useFactory: (
      repository: IXRayAnalysisRepository,
      storage: IXRayFileStorage,
      analyzer: IXRayAnalyzer,
    ) => new CreateXRayAnalysisUseCase(repository, storage, analyzer),
    inject: [
      REPOSITORIES.XRAY_ANALYSIS_REPOSITORY.provide,
      'XRayFileStorage',
      'XRayAnalyzer',
    ],
  },
  GET_FILE: {
    provide: GetXRayAnalysisFileUseCase,
    useFactory: (
      repository: IXRayAnalysisRepository,
      storage: IXRayFileStorage,
    ) => new GetXRayAnalysisFileUseCase(repository, storage),
    inject: [REPOSITORIES.XRAY_ANALYSIS_REPOSITORY.provide, 'XRayFileStorage'],
  },
};

const ADAPTERS = {
  FILE_STORAGE: {
    provide: 'XRayFileStorage',
    useExisting: PatientExamStorage,
  },
  ANALYZER: {
    provide: 'XRayAnalyzer',
    useExisting: XRayAiAnalyzer,
  },
};

export const XRAY_ANALYSIS_PROVIDERS = { REPOSITORIES, USE_CASES, ADAPTERS };
