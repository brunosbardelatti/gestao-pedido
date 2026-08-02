import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { GetCurrentStockPersistence } from './application/ports/get-current-stock-persistence';
import { GET_CURRENT_STOCK_PERSISTENCE } from './application/ports/inventory.tokens';
import { GetCurrentStockUseCase } from './application/use-cases/get-current-stock.use-case';
import { PrismaGetCurrentStockPersistence } from './infrastructure/persistence/prisma-get-current-stock.persistence';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController],
  providers: [
    PrismaGetCurrentStockPersistence,
    {
      provide: GET_CURRENT_STOCK_PERSISTENCE,
      useExisting: PrismaGetCurrentStockPersistence,
    },
    {
      provide: GetCurrentStockUseCase,
      inject: [GET_CURRENT_STOCK_PERSISTENCE],
      useFactory: (persistence: GetCurrentStockPersistence) =>
        new GetCurrentStockUseCase(persistence),
    },
  ],
})
export class InventoryModule {}
