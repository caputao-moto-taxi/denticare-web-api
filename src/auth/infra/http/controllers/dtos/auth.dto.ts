import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
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

export class RefreshTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  refreshToken: string;
}

export class EmailActionDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class AuthActionTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token: string;
}

export class ResetPasswordDto extends AuthActionTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain an uppercase letter and a number',
  })
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
  @ValidateIf((_input, value) => value !== '')
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone?: string;

  @ValidateIf((input: UpdateProfileDto) => input.newPassword !== undefined)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'newPassword must contain an uppercase letter and a number',
  })
  newPassword?: string;
}
