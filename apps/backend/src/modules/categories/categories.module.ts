import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateCategoryPersistence } from './application/ports/create-category-persistence';
import { CREATE_CATEGORY_PERSISTENCE } from './application/ports/categories.tokens';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { PrismaCreateCategoryPersistence } from './infrastructure/persistence/prisma-create-category.persistence';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController],
  providers: [
    PrismaCreateCategoryPersistence,
    {
      provide: CREATE_CATEGORY_PERSISTENCE,
      useExisting: PrismaCreateCategoryPersistence,
    },
    {
      provide: CreateCategoryUseCase,
      inject: [CREATE_CATEGORY_PERSISTENCE],
      useFactory: (persistence: CreateCategoryPersistence) =>
        new CreateCategoryUseCase(persistence),
    },
  ],
})
export class CategoriesModule {}
