import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  IUserRepository,
  UserCreateCommand,
  UserPermissionCommand,
  UserStatusCommand,
  UserUpdateCommand,
} from '../../domain/user.repository';

export class UsersUseCases {
  constructor(private readonly userRepository: IUserRepository) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.userRepository.list(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.userRepository.findOne(user, id);
  }

  getPermissions(user: AuthUser, id: string) {
    return this.userRepository.getPermissions(user, id);
  }

  setPermissions(user: AuthUser, id: string, input: UserPermissionCommand) {
    return this.userRepository.setPermissions(user, id, input);
  }

  create(user: AuthUser, input: UserCreateCommand) {
    return this.userRepository.create(user, input);
  }

  update(user: AuthUser, id: string, input: UserUpdateCommand) {
    return this.userRepository.update(user, id, input);
  }

  setStatus(user: AuthUser, id: string, input: UserStatusCommand) {
    return this.userRepository.setStatus(user, id, input);
  }

  remove(user: AuthUser, id: string) {
    return this.userRepository.remove(user, id);
  }
}
