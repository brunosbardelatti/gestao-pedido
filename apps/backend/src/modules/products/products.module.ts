import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateProductPersistence } from './application/ports/create-product-persistence';
import type { GetProductPersistence } from './application/ports/get-product-persistence';
import type { ListProductsPersistence } from './application/ports/list-products-persistence';
import {
  CREATE_PRODUCT_PERSISTENCE,
  GET_PRODUCT_PERSISTENCE,
  LIST_PRODUCTS_PERSISTENCE,
  SET_PRODUCT_ACTIVE_PERSISTENCE,
  UPDATE_PRODUCT_PERSISTENCE,
} from './application/ports/products.tokens';
import type { SetProductActivePersistence } from './application/ports/set-product-active-persistence';
import type { UpdateProductPersistence } from './application/ports/update-product-persistence';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { SetProductActiveUseCase } from './application/use-cases/set-product-active.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { PrismaCreateProductPersistence } from './infrastructure/persistence/prisma-create-product.persistence';
import { PrismaGetProductPersistence } from './infrastructure/persistence/prisma-get-product.persistence';
import { PrismaListProductsPersistence } from './infrastructure/persistence/prisma-list-products.persistence';
import { PrismaSetProductActivePersistence } from './infrastructure/persistence/prisma-set-product-active.persistence';
import { PrismaUpdateProductPersistence } from './infrastructure/persistence/prisma-update-product.persistence';
import { ProductsController } from './presentation/products.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [
    PrismaCreateProductPersistence,
    PrismaGetProductPersistence,
    PrismaListProductsPersistence,
    PrismaSetProductActivePersistence,
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
      provide: LIST_PRODUCTS_PERSISTENCE,
      useExisting: PrismaListProductsPersistence,
    },
    {
      provide: SET_PRODUCT_ACTIVE_PERSISTENCE,
      useExisting: PrismaSetProductActivePersistence,
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
      provide: ListProductsUseCase,
      inject: [LIST_PRODUCTS_PERSISTENCE],
      useFactory: (persistence: ListProductsPersistence) =>
        new ListProductsUseCase(persistence),
    },
    {
      provide: SetProductActiveUseCase,
      inject: [SET_PRODUCT_ACTIVE_PERSISTENCE],
      useFactory: (persistence: SetProductActivePersistence) =>
        new SetProductActiveUseCase(persistence),
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
