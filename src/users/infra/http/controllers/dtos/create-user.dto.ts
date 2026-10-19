import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { STAFF_ROLES, StaffRole } from '../../../../domain/user.roles';

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

  @IsIn(STAFF_ROLES)
  role: StaffRole;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain an uppercase letter and a number',
  })
  password: string;
}
