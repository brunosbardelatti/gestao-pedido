import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateCategoryPersistence } from './application/ports/create-category-persistence';
import {
  CREATE_CATEGORY_PERSISTENCE,
  UPDATE_CATEGORY_PERSISTENCE,
} from './application/ports/categories.tokens';
import type { UpdateCategoryPersistence } from './application/ports/update-category-persistence';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { PrismaCreateCategoryPersistence } from './infrastructure/persistence/prisma-create-category.persistence';
import { PrismaUpdateCategoryPersistence } from './infrastructure/persistence/prisma-update-category.persistence';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController],
  providers: [
    PrismaCreateCategoryPersistence,
    PrismaUpdateCategoryPersistence,
    {
      provide: CREATE_CATEGORY_PERSISTENCE,
      useExisting: PrismaCreateCategoryPersistence,
    },
    {
      provide: UPDATE_CATEGORY_PERSISTENCE,
      useExisting: PrismaUpdateCategoryPersistence,
    },
    {
      provide: CreateCategoryUseCase,
      inject: [CREATE_CATEGORY_PERSISTENCE],
      useFactory: (persistence: CreateCategoryPersistence) =>
        new CreateCategoryUseCase(persistence),
    },
    {
      provide: UpdateCategoryUseCase,
      inject: [UPDATE_CATEGORY_PERSISTENCE],
      useFactory: (persistence: UpdateCategoryPersistence) =>
        new UpdateCategoryUseCase(persistence),
    },
  ],
})
export class CategoriesModule {}
