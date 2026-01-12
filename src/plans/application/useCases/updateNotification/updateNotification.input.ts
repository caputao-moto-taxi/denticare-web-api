import {
  IsString,
  IsNotEmpty,
  IsOptional,
  validateSync,
  IsDate,
} from 'class-validator';

export type UpdateNotificationInputConstructorProps = {
  id: string;
  title?: string | null;
  status?: string | null;
  body?: string | null;
  scheduledAt?: Date | null;
  notificationType?: string | null;
  applicationId?: string | null;
  reScheduledAt?: Date | null;
  receipts?: string | null;
};

export class UpdateNotificationInput {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  title?: string | null;

  @IsString()
  @IsOptional()
  status?: string | null;

  @IsString()
  @IsOptional()
  body?: string | null;

  @IsDate()
  @IsOptional()
  scheduledAt?: Date | null;

  @IsString()
  @IsOptional()
  notificationType?: string | null;

  @IsString()
  @IsOptional()
  applicationId?: string | null;

  @IsDate()
  @IsOptional()
  reScheduledAt?: Date | null;

  @IsString()
  @IsOptional()
  receipts?: string | null;

  constructor(props: UpdateNotificationInputConstructorProps) {
    if (!props) return;
    this.id = props.id;
    this.title = props.title;
    this.status = props.status;
    this.body = props.body;
    this.scheduledAt = props.scheduledAt;
    this.notificationType = props.notificationType;
    this.applicationId = props.applicationId;
    this.reScheduledAt = props.reScheduledAt;
    this.receipts = props.receipts;
  }
}

export class ValidateUpdateNotificationInput {
  static validate(input: UpdateNotificationInput) {
    return validateSync(input);
  }
}
