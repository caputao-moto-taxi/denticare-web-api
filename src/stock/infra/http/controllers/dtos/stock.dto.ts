import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const UNITS = ['box', 'unit', 'pack', 'bottle'];
const MAX_QUANTITY = 100_000;

export class CreateStockItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  category: string;

  @IsIn(UNITS)
  unit: 'box' | 'unit' | 'pack' | 'bottle';

  @IsInt()
  @Min(0)
  @Max(MAX_QUANTITY)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  capacity?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  unitCost: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  salePrice?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  supplier: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateStockItemDto extends PartialType(CreateStockItemDto) {}

export class RestockStockItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  amount?: number;
}

export class CreateStockSaleItemDto {
  @IsString()
  @MinLength(1)
  stockItemId: string;

  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity: number;
}

export class CreateStockCatalogEntryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}

export class CreateStockSaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsIn(['cash', 'card', 'transfer', 'other'])
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: CreateStockSaleItemDto) => item.stockItemId)
  @ValidateNested({ each: true })
  @Type(() => CreateStockSaleItemDto)
  items: CreateStockSaleItemDto[];
}

export class UpdateStockSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: CreateStockSaleItemDto) => item.stockItemId)
  @ValidateNested({ each: true })
  @Type(() => CreateStockSaleItemDto)
  items: CreateStockSaleItemDto[];
}
