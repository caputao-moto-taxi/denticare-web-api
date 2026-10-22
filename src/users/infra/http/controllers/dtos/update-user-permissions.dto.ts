import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { PERMISSION_CATALOG } from '../../../../../auth/permissions';

export class UpdateUserPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CATALOG.map(({ slug }) => slug), { each: true })
  permissions: string[];
}
