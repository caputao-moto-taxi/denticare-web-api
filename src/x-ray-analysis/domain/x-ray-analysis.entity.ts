export const XRAY_TYPES = [
  'periapical',
  'panoramic',
  'bitewing',
  'cephalometric',
] as const;

export type XRayType = (typeof XRAY_TYPES)[number];

export type XRayAnalysisResult = {
  summary: string;
  observations: {
    description: string;
    location: string;
    confidence: 'low' | 'moderate' | 'high';
  }[];
  imageQuality: {
    rating: 'adequate' | 'limited' | 'unusable';
    issues: string[];
  };
  requiresProfessionalReview: true;
};

export type XRayUpload = {
  originalname: string;
  mimetype: 'image/jpeg' | 'image/png';
  size: number;
  buffer: Buffer;
};

export type XRayAnalysisOutput = {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  region: string;
  fileName: string;
  fileSize: number;
  analysis: unknown;
  modelName: string;
  status: 'analyzed';
  date: string;
};
