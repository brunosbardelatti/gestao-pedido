import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CreateApiKeyUseCase } from '../application/use-cases/create-api-key.use-case';
import { ListApiKeysUseCase } from '../application/use-cases/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from '../application/use-cases/revoke-api-key.use-case';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ListApiKeysQueryDto } from './dto/list-api-keys-query.dto';

@Controller('integrations/api-keys')
export class ApiKeysController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateApiKeyUseCase)
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
    @Inject(ListApiKeysUseCase)
    private readonly listApiKeysUseCase: ListApiKeysUseCase,
    @Inject(RevokeApiKeyUseCase)
    private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase,
  ) {}

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateApiKeyDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateApiKeyDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    apiKey: request.get('x-api-key'),
    });

    const result = await this.createApiKeyUseCase.execute({
      name: input.name,
      scopes: input.scopes,
      expiresAt: input.expiresAt ?? null,
      userId: user.id,
      requestId: request.requestId,
    });

    return { data: result };
  }

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        expectedType: ListApiKeysQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: ListApiKeysQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session, apiKey: request.get('x-api-key') });

    const result = await this.listApiKeysUseCase.execute(query);
    return { data: result.items, meta: result.meta };
  }

  @Delete(':id')
  @HttpCode(204)
  async revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    const user = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    apiKey: request.get('x-api-key'),
    });

    await this.revokeApiKeyUseCase.execute({
      apiKeyId: id,
      userId: user.id,
      requestId: request.requestId,
    });
  }
}
