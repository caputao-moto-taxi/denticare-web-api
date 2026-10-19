import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../../../auth/auth-user';
import { CurrentUser } from '../../../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard';
import { ListQueryDto } from '../../../../shared/infra/http/list-query.dto';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserPermissionsUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  SetUserPermissionsUseCase,
  SetUserStatusUseCase,
  UpdateUserUseCase,
} from '../../../application/useCases';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserStatusDto,
} from './dtos';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getUserPermissionsUseCase: GetUserPermissionsUseCase,
    private readonly setUserPermissionsUseCase: SetUserPermissionsUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly setUserStatusUseCase: SetUserStatusUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.listUsersUseCase.execute({ user, query });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getUserUseCase.execute({ user, id });
  }

  @Get(':id/permissions')
  getPermissions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getUserPermissionsUseCase.execute({ user, id });
  }

  @Patch(':id/permissions')
  setPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateUserPermissionsDto,
  ) {
    return this.setUserPermissionsUseCase.execute({
      user,
      id,
      permissions: input,
    });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: CreateUserDto) {
    return this.createUserUseCase.execute({ user, ...input });
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
  ) {
    return this.updateUserUseCase.execute({ user, id, changes: input });
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateUserStatusDto,
  ) {
    return this.setUserStatusUseCase.execute({ user, id, status: input });
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deleteUserUseCase.execute({ user, id });
  }
}
