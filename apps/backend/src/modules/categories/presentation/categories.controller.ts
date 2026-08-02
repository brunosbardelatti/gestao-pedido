import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case';
import { SetCategoryActiveUseCase } from '../application/use-cases/set-category-active.use-case';
import { UpdateCategoryUseCase } from '../application/use-cases/update-category.use-case';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { SetCategoryActiveDto } from './dto/set-category-active.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateCategoryUseCase)
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    @Inject(ListCategoriesUseCase)
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    @Inject(UpdateCategoryUseCase)
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    @Inject(SetCategoryActiveUseCase)
    private readonly setCategoryActiveUseCase: SetCategoryActiveUseCase,
  ) {}

  @Get()
  async list(
    @Query(
      new ValidationPipe({
        expectedType: ListCategoriesQueryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    query: ListCategoriesQueryDto,
    @Req() request: RequestWithId,
  ) {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });
    const result = await this.listCategoriesUseCase.execute(query);

    return { data: result.items, meta: result.meta };
  }

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateCategoryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateCategoryDto,
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
    const category = await this.createCategoryUseCase.execute({
      actorId: actor.id,
      name: input.name,
      requestId: request.requestId,
    });

    return { data: category };
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) categoryId: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateCategoryDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: UpdateCategoryDto,
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
    const category = await this.updateCategoryUseCase.execute({
      actorId: actor.id,
      categoryId,
      name: input.name,
      requestId: request.requestId,
    });

    return { data: category };
  }

  @Patch(':id/active')
  async setActive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) categoryId: string,
    @Body(
      new ValidationPipe({
        expectedType: SetCategoryActiveDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: SetCategoryActiveDto,
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
    const category = await this.setCategoryActiveUseCase.execute({
      actorId: actor.id,
      categoryId,
      active: input.active,
      requestId: request.requestId,
    });

    return { data: category };
  }
}
