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
import { UsersUseCases } from '../../../application/useCases/users.use-cases';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  UpdateUserStatusDto,
} from './dtos/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersUseCases) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.usersService.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  @Get(':id/permissions')
  getPermissions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.getPermissions(user, id);
  }

  @Patch(':id/permissions')
  setPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateUserPermissionsDto,
  ) {
    return this.usersService.setPermissions(user, id, input);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: CreateUserDto) {
    return this.usersService.create(user, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateUserDto,
  ) {
    return this.usersService.update(user, id, input);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateUserStatusDto,
  ) {
    return this.usersService.setStatus(user, id, input);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.remove(user, id);
  }
}
