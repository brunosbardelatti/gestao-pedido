import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateBrandPersistence } from './application/ports/create-brand-persistence';
import {
  CREATE_BRAND_PERSISTENCE,
  LIST_BRANDS_PERSISTENCE,
  SET_BRAND_ACTIVE_PERSISTENCE,
  UPDATE_BRAND_PERSISTENCE,
} from './application/ports/brands.tokens';
import type { ListBrandsPersistence } from './application/ports/list-brands-persistence';
import type { SetBrandActivePersistence } from './application/ports/set-brand-active-persistence';
import type { UpdateBrandPersistence } from './application/ports/update-brand-persistence';
import { CreateBrandUseCase } from './application/use-cases/create-brand.use-case';
import { ListBrandsUseCase } from './application/use-cases/list-brands.use-case';
import { SetBrandActiveUseCase } from './application/use-cases/set-brand-active.use-case';
import { UpdateBrandUseCase } from './application/use-cases/update-brand.use-case';
import { PrismaCreateBrandPersistence } from './infrastructure/persistence/prisma-create-brand.persistence';
import { PrismaListBrandsPersistence } from './infrastructure/persistence/prisma-list-brands.persistence';
import { PrismaSetBrandActivePersistence } from './infrastructure/persistence/prisma-set-brand-active.persistence';
import { PrismaUpdateBrandPersistence } from './infrastructure/persistence/prisma-update-brand.persistence';
import { BrandsController } from './presentation/brands.controller';

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
  providers: [
    PrismaCreateBrandPersistence,
    PrismaListBrandsPersistence,
    PrismaSetBrandActivePersistence,
    PrismaUpdateBrandPersistence,
    {
      provide: CREATE_BRAND_PERSISTENCE,
      useExisting: PrismaCreateBrandPersistence,
    },
    {
      provide: LIST_BRANDS_PERSISTENCE,
      useExisting: PrismaListBrandsPersistence,
    },
    {
      provide: SET_BRAND_ACTIVE_PERSISTENCE,
      useExisting: PrismaSetBrandActivePersistence,
    },
    {
      provide: UPDATE_BRAND_PERSISTENCE,
      useExisting: PrismaUpdateBrandPersistence,
    },
    {
      provide: ListBrandsUseCase,
      inject: [LIST_BRANDS_PERSISTENCE],
      useFactory: (persistence: ListBrandsPersistence) =>
        new ListBrandsUseCase(persistence),
    },
    {
      provide: SetBrandActiveUseCase,
      inject: [SET_BRAND_ACTIVE_PERSISTENCE],
      useFactory: (persistence: SetBrandActivePersistence) =>
        new SetBrandActiveUseCase(persistence),
    },
    {
      provide: CreateBrandUseCase,
      inject: [CREATE_BRAND_PERSISTENCE],
      useFactory: (persistence: CreateBrandPersistence) =>
        new CreateBrandUseCase(persistence),
    },
    {
      provide: UpdateBrandUseCase,
      inject: [UPDATE_BRAND_PERSISTENCE],
      useFactory: (persistence: UpdateBrandPersistence) =>
        new UpdateBrandUseCase(persistence),
    },
  ],
})
export class BrandsModule {}
