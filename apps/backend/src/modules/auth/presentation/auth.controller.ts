import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(LogoutUseCase) private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Get('me')
  async getCurrentUser(@Req() request: RequestWithId): Promise<{
    data: {
      id: string;
      name: string;
      login: string;
      role: 'ADMIN' | 'OPERATOR';
      active: boolean;
    };
  }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });

    return { data: user };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(
      new ValidationPipe({
        expectedType: LoginDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: LoginDto,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    data: {
      id: string;
      name: string;
      login: string;
      role: 'ADMIN' | 'OPERATOR';
      active: boolean;
    };
  }> {
    const result = await this.loginUseCase.execute({
      login: input.login,
      password: input.password,
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.get('user-agent')?.slice(0, 500),
    });
    const maxAge = result.session.expiresAt.getTime() - Date.now();

    response.cookie('session', result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
      expires: result.session.expiresAt,
    });

    return { data: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, string | undefined>;

    await this.logoutUseCase.execute({
      token: cookies.session,
      requestId: request.requestId,
    });

    response.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
