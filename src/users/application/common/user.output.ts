import { User } from '../../domain/user.entity';
import { StaffRole } from '../../domain/user.roles';

export type UserOutput = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  avatar: string;
};

export class UserOutputMapper {
  static toOutput(user: User): UserOutput {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
      avatar: user.avatar,
    };
  }
}
