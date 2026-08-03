import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(ResetPasswordUseCase)
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

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
