import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { AdjustStockPersistence } from './application/ports/adjust-stock-persistence';
import type { GetCurrentStockPersistence } from './application/ports/get-current-stock-persistence';
import {
  GET_CURRENT_STOCK_PERSISTENCE,
  ADJUST_STOCK_PERSISTENCE,
  LIST_INVENTORY_MOVEMENTS_PERSISTENCE,
} from './application/ports/inventory.tokens';
import type { ListInventoryMovementsPersistence } from './application/ports/list-inventory-movements-persistence';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case';
import { GetCurrentStockUseCase } from './application/use-cases/get-current-stock.use-case';
import { ListInventoryMovementsUseCase } from './application/use-cases/list-inventory-movements.use-case';
import { PrismaGetCurrentStockPersistence } from './infrastructure/persistence/prisma-get-current-stock.persistence';
import { PrismaAdjustStockPersistence } from './infrastructure/persistence/prisma-adjust-stock.persistence';
import { PrismaListInventoryMovementsPersistence } from './infrastructure/persistence/prisma-list-inventory-movements.persistence';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController],
  providers: [
    PrismaAdjustStockPersistence,
    PrismaGetCurrentStockPersistence,
    PrismaListInventoryMovementsPersistence,
    {
      provide: ADJUST_STOCK_PERSISTENCE,
      useExisting: PrismaAdjustStockPersistence,
    },
    {
      provide: GET_CURRENT_STOCK_PERSISTENCE,
      useExisting: PrismaGetCurrentStockPersistence,
    },
    {
      provide: AdjustStockUseCase,
      inject: [ADJUST_STOCK_PERSISTENCE],
      useFactory: (persistence: AdjustStockPersistence) =>
        new AdjustStockUseCase(persistence),
    },
    {
      provide: GetCurrentStockUseCase,
      inject: [GET_CURRENT_STOCK_PERSISTENCE],
      useFactory: (persistence: GetCurrentStockPersistence) =>
        new GetCurrentStockUseCase(persistence),
    },
    {
      provide: LIST_INVENTORY_MOVEMENTS_PERSISTENCE,
      useExisting: PrismaListInventoryMovementsPersistence,
    },
    {
      provide: ListInventoryMovementsUseCase,
      inject: [LIST_INVENTORY_MOVEMENTS_PERSISTENCE],
      useFactory: (persistence: ListInventoryMovementsPersistence) =>
        new ListInventoryMovementsUseCase(persistence),
    },
  ],
})
export class InventoryModule {}
