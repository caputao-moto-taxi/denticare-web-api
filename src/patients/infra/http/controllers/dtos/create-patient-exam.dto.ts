import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum ExamType {
  PANORAMIC = 'Raio-X Panorâmico',
  PERIAPICAL = 'Periapical',
  TOMOGRAPHY = 'Tomografia',
  SCAN_3D = '3D Scan',
  PHOTOGRAPH = 'Fotografia',
}

export class CreatePatientExamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsEnum(ExamType)
  type: ExamType;
}
