import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Credentials cannot be changed through the general user update endpoint.
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['name', 'phone', 'role'] as const),
) {}
