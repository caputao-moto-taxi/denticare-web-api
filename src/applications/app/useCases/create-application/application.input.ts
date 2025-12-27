import { ApplicationVersionStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  validateSync,
  IsEnum,
} from 'class-validator';

export type CreateApplicationInputConstructorProps = {
  name?: string;
  versionStatus: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class CreateApplicationInput {
  @IsString({ message: 'ApplicaionName must be a string.' })
  @IsNotEmpty({ message: 'ApplicationName is required.' })
  name: string;

  @IsString({ message: 'versionStatus must be a string.' })
  @IsNotEmpty({ message: 'versionStatus is required.' })
  @IsEnum(ApplicationVersionStatus)
  versionStatus: string | null;

  constructor(props: CreateApplicationInputConstructorProps) {
    if (!props) return;
    this.name = props.name;
    this.versionStatus = props.versionStatus;
  }
}

export class ValidateCreateApplicationInput {
  static validate(input: CreateApplicationInput) {
    return validateSync(input);
  }
}
