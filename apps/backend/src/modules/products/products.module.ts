import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateProductPersistence } from './application/ports/create-product-persistence';
import type { GetProductPersistence } from './application/ports/get-product-persistence';
import {
  CREATE_PRODUCT_PERSISTENCE,
  GET_PRODUCT_PERSISTENCE,
  UPDATE_PRODUCT_PERSISTENCE,
} from './application/ports/products.tokens';
import type { UpdateProductPersistence } from './application/ports/update-product-persistence';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { PrismaCreateProductPersistence } from './infrastructure/persistence/prisma-create-product.persistence';
import { PrismaGetProductPersistence } from './infrastructure/persistence/prisma-get-product.persistence';
import { PrismaUpdateProductPersistence } from './infrastructure/persistence/prisma-update-product.persistence';
import { ProductsController } from './presentation/products.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [
    PrismaCreateProductPersistence,
    PrismaGetProductPersistence,
    PrismaUpdateProductPersistence,
    {
      provide: CREATE_PRODUCT_PERSISTENCE,
      useExisting: PrismaCreateProductPersistence,
    },
    {
      provide: GET_PRODUCT_PERSISTENCE,
      useExisting: PrismaGetProductPersistence,
    },
    {
      provide: UPDATE_PRODUCT_PERSISTENCE,
      useExisting: PrismaUpdateProductPersistence,
    },
    {
      provide: CreateProductUseCase,
      inject: [CREATE_PRODUCT_PERSISTENCE],
      useFactory: (persistence: CreateProductPersistence) =>
        new CreateProductUseCase(persistence),
    },
    {
      provide: GetProductUseCase,
      inject: [GET_PRODUCT_PERSISTENCE],
      useFactory: (persistence: GetProductPersistence) =>
        new GetProductUseCase(persistence),
    },
    {
      provide: UpdateProductUseCase,
      inject: [UPDATE_PRODUCT_PERSISTENCE],
      useFactory: (persistence: UpdateProductPersistence) =>
        new UpdateProductUseCase(persistence),
    },
  ],
})
export class ProductsModule {}
