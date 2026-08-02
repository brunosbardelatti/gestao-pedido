import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateBrandPersistence } from './application/ports/create-brand-persistence';
import {
  CREATE_BRAND_PERSISTENCE,
  SET_BRAND_ACTIVE_PERSISTENCE,
  UPDATE_BRAND_PERSISTENCE,
} from './application/ports/brands.tokens';
import type { SetBrandActivePersistence } from './application/ports/set-brand-active-persistence';
import type { UpdateBrandPersistence } from './application/ports/update-brand-persistence';
import { CreateBrandUseCase } from './application/use-cases/create-brand.use-case';
import { SetBrandActiveUseCase } from './application/use-cases/set-brand-active.use-case';
import { UpdateBrandUseCase } from './application/use-cases/update-brand.use-case';
import { PrismaCreateBrandPersistence } from './infrastructure/persistence/prisma-create-brand.persistence';
import { PrismaSetBrandActivePersistence } from './infrastructure/persistence/prisma-set-brand-active.persistence';
import { PrismaUpdateBrandPersistence } from './infrastructure/persistence/prisma-update-brand.persistence';
import { BrandsController } from './presentation/brands.controller';

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
  providers: [
    PrismaCreateBrandPersistence,
    PrismaSetBrandActivePersistence,
    PrismaUpdateBrandPersistence,
    {
      provide: CREATE_BRAND_PERSISTENCE,
      useExisting: PrismaCreateBrandPersistence,
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
