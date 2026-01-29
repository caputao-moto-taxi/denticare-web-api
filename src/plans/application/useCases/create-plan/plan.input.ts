import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsNumber,
  Min,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export type CreatePlanInputConstructorProps = {
  name: string;
  price: number;
  currencyId: string;
  duration: number;
  isOnPromotion: boolean;
  promotionalPrice?: number;
  promotionalStartDate?: Date;
  promotionalEndDate?: Date;
  totalBranch: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export class CreatePlanInput {
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.0)
  price: number;

  @IsUUID(4)
  currencyId: string;

  @IsNotEmpty()
  duration: number;

  @IsBoolean()
  isOnPromotion: boolean;

  @IsOptional()
  @IsNumber()
  promotionalPrice?: number;

  @IsOptional()
  @IsDate()
  promotionalStartDate?: Date;

  @IsOptional()
  @IsDate()
  promotionalEndDate?: Date;

  @IsNotEmpty()
  @IsNumber()
  totalBranch: number;

  benefits?: string[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: CreatePlanInputConstructorProps) {
    if (!props) return;
    this.name = props.name;
    this.price = props.price;
    this.currencyId = props.currencyId;
    this.duration = props.duration;
    this.isOnPromotion = props.isOnPromotion;
    this.promotionalPrice = props.promotionalPrice;
    this.promotionalStartDate = props.promotionalStartDate;
    this.promotionalEndDate = props.promotionalEndDate;
    this.totalBranch = props.totalBranch;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
