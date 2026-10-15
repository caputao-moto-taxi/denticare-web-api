import { PartialType, PickType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PERMISSION_CATALOG } from '../../../../../auth/permissions';

const ROLES = ['admin', 'doctor', 'nurse', 'secretary'] as const;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone?: string;

  @IsIn(ROLES)
  role: (typeof ROLES)[number];

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain an uppercase letter and a number',
  })
  password: string;
}

// Email and password are credentials and are not editable here.
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['name', 'phone', 'role'] as const),
) {}

export class UpdateUserStatusDto {
  @IsBoolean()
  active: boolean;
}

export class UpdateUserPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CATALOG.map(({ slug }) => slug), { each: true })
  permissions: string[];
}
