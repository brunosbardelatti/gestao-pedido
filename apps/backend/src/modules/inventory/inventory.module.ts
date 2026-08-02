import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { GetCurrentStockPersistence } from './application/ports/get-current-stock-persistence';
import {
  GET_CURRENT_STOCK_PERSISTENCE,
  LIST_INVENTORY_MOVEMENTS_PERSISTENCE,
} from './application/ports/inventory.tokens';
import type { ListInventoryMovementsPersistence } from './application/ports/list-inventory-movements-persistence';
import { GetCurrentStockUseCase } from './application/use-cases/get-current-stock.use-case';
import { ListInventoryMovementsUseCase } from './application/use-cases/list-inventory-movements.use-case';
import { PrismaGetCurrentStockPersistence } from './infrastructure/persistence/prisma-get-current-stock.persistence';
import { PrismaListInventoryMovementsPersistence } from './infrastructure/persistence/prisma-list-inventory-movements.persistence';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController],
  providers: [
    PrismaGetCurrentStockPersistence,
    PrismaListInventoryMovementsPersistence,
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
