import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateSalePersistence } from './application/ports/create-sale-persistence';
import { CREATE_SALE_PERSISTENCE } from './application/ports/sales.tokens';
import { CreateSaleUseCase } from './application/use-cases/create-sale.use-case';
import { PrismaCreateSalePersistence } from './infrastructure/persistence/prisma-create-sale.persistence';
import { SalesController } from './presentation/sales.controller';

@Module({
  imports: [AuthModule],
  controllers: [SalesController],
  providers: [
    PrismaCreateSalePersistence,
    { provide: CREATE_SALE_PERSISTENCE, useExisting: PrismaCreateSalePersistence },
    {
      provide: CreateSaleUseCase,
      inject: [CREATE_SALE_PERSISTENCE],
      useFactory: (persistence: CreateSalePersistence) =>
        new CreateSaleUseCase(persistence),
    },
  ],
})
export class SalesModule {}
