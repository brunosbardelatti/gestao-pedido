import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CreateBrandUseCase } from '../application/use-cases/create-brand.use-case';
import { CreateBrandDto } from './dto/create-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateBrandUseCase)
    private readonly createBrandUseCase: CreateBrandUseCase,
  ) {}

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateBrandDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateBrandDto,
    @Req() request: RequestWithId,
  ): Promise<{
    data: {
      id: string;
      name: string;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const brand = await this.createBrandUseCase.execute({
      actorId: actor.id,
      name: input.name,
      requestId: request.requestId,
    });

    return { data: brand };
  }
}
