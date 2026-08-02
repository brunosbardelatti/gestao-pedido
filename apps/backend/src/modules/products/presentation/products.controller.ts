import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  ValidationPipe,
} from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import {
  type CreateProductOutput,
  CreateProductUseCase,
} from '../application/use-cases/create-product.use-case';
import { GetProductUseCase } from '../application/use-cases/get-product.use-case';
import {
  type SetProductActiveOutput,
  SetProductActiveUseCase,
} from '../application/use-cases/set-product-active.use-case';
import {
  type UpdateProductOutput,
  UpdateProductUseCase,
} from '../application/use-cases/update-product.use-case';
import { CreateProductDto } from './dto/create-product.dto';
import { SetProductActiveDto } from './dto/set-product-active.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateProductUseCase)
    private readonly createProductUseCase: CreateProductUseCase,
    @Inject(GetProductUseCase)
    private readonly getProductUseCase: GetProductUseCase,
    @Inject(SetProductActiveUseCase)
    private readonly setProductActiveUseCase: SetProductActiveUseCase,
    @Inject(UpdateProductUseCase)
    private readonly updateProductUseCase: UpdateProductUseCase,
  ) {}

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Req() request: RequestWithId,
  ): Promise<{ data: CreateProductOutput }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    await this.getCurrentUserUseCase.execute({ token: cookies.session });

    return { data: await this.getProductUseCase.execute(productId) };
  }

  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateProductDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: CreateProductDto,
    @Req() request: RequestWithId,
  ): Promise<{ data: CreateProductOutput }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const product = await this.createProductUseCase.execute({
      actorId: actor.id,
      brandId: input.brandId,
      categoryId: input.categoryId,
      code: input.code,
      description: input.description,
      catalogPrice: input.catalogPrice,
      purchasePrice: input.purchasePrice,
      originalPrice: input.originalPrice,
      suggestedSalePrice: input.suggestedSalePrice,
      requestId: request.requestId,
    });

    return { data: product };
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateProductDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: UpdateProductDto,
    @Req() request: RequestWithId,
  ): Promise<{ data: UpdateProductOutput }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const product = await this.updateProductUseCase.execute({
      actorId: actor.id,
      productId,
      brandId: input.brandId,
      categoryId: input.categoryId,
      code: input.code,
      description: input.description,
      catalogPrice: input.catalogPrice,
      purchasePrice: input.purchasePrice,
      originalPrice: input.originalPrice,
      suggestedSalePrice: input.suggestedSalePrice,
      requestId: request.requestId,
    });

    return { data: product };
  }

  @Patch(':id/active')
  async setActive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body(
      new ValidationPipe({
        expectedType: SetProductActiveDto,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    input: SetProductActiveDto,
    @Req() request: RequestWithId,
  ): Promise<{ data: SetProductActiveOutput }> {
    const cookies = request.cookies as Record<string, string | undefined>;
    const actor = await this.getCurrentUserUseCase.execute({
      token: cookies.session,
    });
    const product = await this.setProductActiveUseCase.execute({
      actorId: actor.id,
      productId,
      active: input.active,
      requestId: request.requestId,
    });

    return { data: product };
  }
}
