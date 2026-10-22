import { Transform } from 'class-transformer';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { XRAY_TYPES } from './domain/x-ray-analysis.entity';

export { XRAY_TYPES };

export class CreateXRayAnalysisDto {
  @IsUUID()
  patientId!: string;

  @IsIn(XRAY_TYPES)
  type!: (typeof XRAY_TYPES)[number];

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(2)
  @MaxLength(60)
  region!: string;
}
