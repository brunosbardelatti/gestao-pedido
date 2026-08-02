import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CancelSalePersistence } from './application/ports/cancel-sale-persistence';
import type { CreateSalePersistence } from './application/ports/create-sale-persistence';
import {
  CANCEL_SALE_PERSISTENCE,
  CREATE_SALE_PERSISTENCE,
} from './application/ports/sales.tokens';
import { CancelSaleUseCase } from './application/use-cases/cancel-sale.use-case';
import { CreateSaleUseCase } from './application/use-cases/create-sale.use-case';
import { PrismaCancelSalePersistence } from './infrastructure/persistence/prisma-cancel-sale.persistence';
import { PrismaCreateSalePersistence } from './infrastructure/persistence/prisma-create-sale.persistence';
import { SalesController } from './presentation/sales.controller';

@Module({
  imports: [AuthModule],
  controllers: [SalesController],
  providers: [
    PrismaCancelSalePersistence,
    PrismaCreateSalePersistence,
    { provide: CANCEL_SALE_PERSISTENCE, useExisting: PrismaCancelSalePersistence },
    { provide: CREATE_SALE_PERSISTENCE, useExisting: PrismaCreateSalePersistence },
    {
      provide: CancelSaleUseCase,
      inject: [CANCEL_SALE_PERSISTENCE],
      useFactory: (persistence: CancelSalePersistence) =>
        new CancelSaleUseCase(persistence),
    },
    {
      provide: CreateSaleUseCase,
      inject: [CREATE_SALE_PERSISTENCE],
      useFactory: (persistence: CreateSalePersistence) =>
        new CreateSaleUseCase(persistence),
    },
  ],
})
export class SalesModule {}
