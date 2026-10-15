import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  clinicName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  taxId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  clinicPhone: string;

  @IsEmail()
  @MaxLength(254)
  clinicEmail: string;

  @IsString()
  @MinLength(4)
  @MaxLength(300)
  address: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminName: string;

  @IsEmail()
  @MaxLength(254)
  adminEmail: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  adminPhone: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain an uppercase letter and a number',
  })
  password: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone?: string;
}
