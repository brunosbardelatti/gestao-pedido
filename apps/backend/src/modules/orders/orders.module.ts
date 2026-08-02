import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CreateOrderPersistence } from './application/ports/create-order-persistence';
import { CREATE_ORDER_PERSISTENCE } from './application/ports/orders.tokens';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { PrismaCreateOrderPersistence } from './infrastructure/persistence/prisma-create-order.persistence';
import { OrdersController } from './presentation/orders.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [
    PrismaCreateOrderPersistence,
    {
      provide: CREATE_ORDER_PERSISTENCE,
      useExisting: PrismaCreateOrderPersistence,
    },
    {
      provide: CreateOrderUseCase,
      inject: [CREATE_ORDER_PERSISTENCE],
      useFactory: (persistence: CreateOrderPersistence) =>
        new CreateOrderUseCase(persistence),
    },
  ],
})
export class OrdersModule {}
