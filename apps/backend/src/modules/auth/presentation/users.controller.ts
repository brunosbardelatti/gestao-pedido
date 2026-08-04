import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import type { UserSummary } from '../application/ports/user-management-persistence';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(ResetPasswordUseCase)
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    @Inject(ListUsersUseCase)
    private readonly listUsersUseCase: ListUsersUseCase,
    @Inject(CreateUserUseCase)
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject(UpdateUserUseCase)
    private readonly updateUserUseCase: UpdateUserUseCase,
  ) {}

  @Get()
  async listUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
    @Req() request: RequestWithId,
  ): Promise<{ data: UserSummary[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
      apiKey: request.get('x-api-key'),
    });

    const result = await this.listUsersUseCase.execute({
      actor: { role: actor.role },
      page,
      pageSize,
    });

    return {
      data: result.users,
      meta: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    };
  }

  @Post()
  @HttpCode(201)
  async createUser(
    @Body(
      new ValidationPipe({
        expectedType: CreateUserDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateUserDto,
    @Req() request: RequestWithId,
  ): Promise<{ data: UserSummary }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
      apiKey: request.get('x-api-key'),
    });

    const user = await this.createUserUseCase.execute({
      actor: { id: actor.id, role: actor.role },
      name: input.name,
      login: input.login,
      password: input.password,
      role: input.role,
      requestId: request.requestId,
    });

    return { data: user };
  }

  @Patch(':id')
  @HttpCode(200)
  async updateUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateUserDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: UpdateUserDto,
    @Req() request: RequestWithId,
  ): Promise<{ data: UserSummary }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
      apiKey: request.get('x-api-key'),
    });

    const user = await this.updateUserUseCase.execute({
      actor: { id: actor.id, role: actor.role },
      targetUserId,
      name: input.name,
      role: input.role,
      active: input.active,
      requestId: request.requestId,
    });

    return { data: user };
  }

  @Post(':id/reset-password')
  @HttpCode(204)
  async resetPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @Body(
      new ValidationPipe({
        expectedType: ResetPasswordDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: ResetPasswordDto,
    @Req() request: RequestWithId,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
      apiKey: request.get('x-api-key'),
    });

    await this.resetPasswordUseCase.execute({
      actor: { id: actor.id, role: actor.role },
      targetUserId,
      newPassword: input.newPassword,
      requestId: request.requestId,
    });
  }
}
