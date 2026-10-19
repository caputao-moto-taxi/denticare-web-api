import {
  IsEnum,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum FinancialMethod {
  MULTICAIXA = 'Multicaixa',
  TRANSFER = 'Transferência',
  CASH = 'Dinheiro',
  INSURANCE = 'Convênio',
}

export class CreatePatientFinancialEntryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000)
  amount: number;

  @IsEnum(FinancialMethod)
  method: FinancialMethod;
}
