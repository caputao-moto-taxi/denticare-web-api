import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export type CampaignChannel = 'EMAIL' | 'SMS';

export class CampaignAudienceQueryDto {
  @IsIn(['EMAIL', 'SMS'])
  channel: CampaignChannel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class SendCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsIn(['EMAIL', 'SMS'])
  channel: CampaignChannel;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(250)
  @IsUUID('all', { each: true })
  recipientIds: string[];
}

export class UpdatePatientMarketingConsentDto {
  @IsBoolean()
  marketingEmailConsent: boolean;

  @IsBoolean()
  marketingSmsConsent: boolean;
}
