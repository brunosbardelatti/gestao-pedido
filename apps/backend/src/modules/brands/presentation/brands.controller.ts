import {
  Body,
  Controller,
  Inject,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CreateBrandUseCase } from '../application/use-cases/create-brand.use-case';
import { SetBrandActiveUseCase } from '../application/use-cases/set-brand-active.use-case';
import { UpdateBrandUseCase } from '../application/use-cases/update-brand.use-case';
import { CreateBrandDto } from './dto/create-brand.dto';
import { SetBrandActiveDto } from './dto/set-brand-active.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateBrandUseCase)
    private readonly createBrandUseCase: CreateBrandUseCase,
    @Inject(UpdateBrandUseCase)
    private readonly updateBrandUseCase: UpdateBrandUseCase,
    @Inject(SetBrandActiveUseCase)
    private readonly setBrandActiveUseCase: SetBrandActiveUseCase,
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

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateBrandDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: UpdateBrandDto,
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
    const brand = await this.updateBrandUseCase.execute({
      actorId: actor.id,
      brandId,
      name: input.name,
      requestId: request.requestId,
    });

    return { data: brand };
  }

  @Patch(':id/active')
  async setActive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Body(
      new ValidationPipe({
        expectedType: SetBrandActiveDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: SetBrandActiveDto,
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
    const brand = await this.setBrandActiveUseCase.execute({
      actorId: actor.id,
      brandId,
      active: input.active,
      requestId: request.requestId,
    });

    return { data: brand };
  }
}
