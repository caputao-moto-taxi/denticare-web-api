import { IsBoolean } from 'class-validator';

export class UpdatePatientStatusDto {
  @IsBoolean()
  active: boolean;
}
