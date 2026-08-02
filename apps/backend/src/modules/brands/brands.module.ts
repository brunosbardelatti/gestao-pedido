import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateBrandPersistence } from './application/ports/create-brand-persistence';
import { CREATE_BRAND_PERSISTENCE } from './application/ports/brands.tokens';
import { CreateBrandUseCase } from './application/use-cases/create-brand.use-case';
import { PrismaCreateBrandPersistence } from './infrastructure/persistence/prisma-create-brand.persistence';
import { BrandsController } from './presentation/brands.controller';

@Module({
  imports: [AuthModule],
  controllers: [BrandsController],
  providers: [
    PrismaCreateBrandPersistence,
    {
      provide: CREATE_BRAND_PERSISTENCE,
      useExisting: PrismaCreateBrandPersistence,
    },
    {
      provide: CreateBrandUseCase,
      inject: [CREATE_BRAND_PERSISTENCE],
      useFactory: (persistence: CreateBrandPersistence) =>
        new CreateBrandUseCase(persistence),
    },
  ],
})
export class BrandsModule {}
