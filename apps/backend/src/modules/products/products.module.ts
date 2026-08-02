import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateProductPersistence } from './application/ports/create-product-persistence';
import { CREATE_PRODUCT_PERSISTENCE } from './application/ports/products.tokens';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { PrismaCreateProductPersistence } from './infrastructure/persistence/prisma-create-product.persistence';
import { ProductsController } from './presentation/products.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [
    PrismaCreateProductPersistence,
    {
      provide: CREATE_PRODUCT_PERSISTENCE,
      useExisting: PrismaCreateProductPersistence,
    },
    {
      provide: CreateProductUseCase,
      inject: [CREATE_PRODUCT_PERSISTENCE],
      useFactory: (persistence: CreateProductPersistence) =>
        new CreateProductUseCase(persistence),
    },
  ],
})
export class ProductsModule {}
