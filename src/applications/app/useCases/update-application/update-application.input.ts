import {
  IsString,
  IsNotEmpty,
  IsOptional,
  validateSync,
} from 'class-validator';

export type UpdateApplicationInputConstructorProps = {
  id: string;
  name?: string | null;
  versionStatus?: string | null;
};

export class UpdateApplicationInput {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  name?: string | null;

  @IsOptional()
  @IsOptional()
  versionStatus?: string | null;

  constructor(props: UpdateApplicationInputConstructorProps) {
    if (!props) return;
    this.id = props.id;
    this.name = props.name;
    this.versionStatus = props.versionStatus;
  }
}

export class ValidateUpdateApplicationInput {
  static validate(input: UpdateApplicationInput) {
    return validateSync(input);
  }
}
