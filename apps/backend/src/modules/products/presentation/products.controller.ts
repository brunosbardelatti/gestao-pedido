import { Body, Controller, Inject, Post, Req, ValidationPipe } from '@nestjs/common';

import type { RequestWithId } from '../../../common/http/request-with-id';
import { GetCurrentUserUseCase } from '../../auth/application/use-cases/get-current-user.use-case';
import {
  type CreateProductOutput,
  CreateProductUseCase,
} from '../application/use-cases/create-product.use-case';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(CreateProductUseCase)
    private readonly createProductUseCase: CreateProductUseCase,
  ) {}

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
}
