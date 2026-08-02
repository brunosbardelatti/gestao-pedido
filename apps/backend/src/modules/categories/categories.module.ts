import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateCategoryPersistence } from './application/ports/create-category-persistence';
import {
  CREATE_CATEGORY_PERSISTENCE,
  SET_CATEGORY_ACTIVE_PERSISTENCE,
  UPDATE_CATEGORY_PERSISTENCE,
} from './application/ports/categories.tokens';
import type { SetCategoryActivePersistence } from './application/ports/set-category-active-persistence';
import type { UpdateCategoryPersistence } from './application/ports/update-category-persistence';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { SetCategoryActiveUseCase } from './application/use-cases/set-category-active.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { PrismaCreateCategoryPersistence } from './infrastructure/persistence/prisma-create-category.persistence';
import { PrismaSetCategoryActivePersistence } from './infrastructure/persistence/prisma-set-category-active.persistence';
import { PrismaUpdateCategoryPersistence } from './infrastructure/persistence/prisma-update-category.persistence';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController],
  providers: [
    PrismaCreateCategoryPersistence,
    PrismaSetCategoryActivePersistence,
    PrismaUpdateCategoryPersistence,
    {
      provide: CREATE_CATEGORY_PERSISTENCE,
      useExisting: PrismaCreateCategoryPersistence,
    },
    {
      provide: SET_CATEGORY_ACTIVE_PERSISTENCE,
      useExisting: PrismaSetCategoryActivePersistence,
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
      provide: SetCategoryActiveUseCase,
      inject: [SET_CATEGORY_ACTIVE_PERSISTENCE],
      useFactory: (persistence: SetCategoryActivePersistence) =>
        new SetCategoryActiveUseCase(persistence),
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
