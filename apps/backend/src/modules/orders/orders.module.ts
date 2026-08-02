import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import type { CancelOrderPersistence } from './application/ports/cancel-order-persistence';
import type { CreateOrderPersistence } from './application/ports/create-order-persistence';
import type { GetOrderPersistence } from './application/ports/get-order-persistence';
import type { ListOrdersPersistence } from './application/ports/list-orders-persistence';
import {
  CANCEL_ORDER_PERSISTENCE,
  CREATE_ORDER_PERSISTENCE,
  GET_ORDER_PERSISTENCE,
  LIST_ORDERS_PERSISTENCE,
  RECEIVE_ORDER_PERSISTENCE,
  UPDATE_ORDER_PERSISTENCE,
} from './application/ports/orders.tokens';
import type { ReceiveOrderPersistence } from './application/ports/receive-order-persistence';
import type { UpdateOrderPersistence } from './application/ports/update-order-persistence';
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from './application/use-cases/list-orders.use-case';
import { ReceiveOrderUseCase } from './application/use-cases/receive-order.use-case';
import { UpdateOrderUseCase } from './application/use-cases/update-order.use-case';
import { PrismaCancelOrderPersistence } from './infrastructure/persistence/prisma-cancel-order.persistence';
import { PrismaCreateOrderPersistence } from './infrastructure/persistence/prisma-create-order.persistence';
import { PrismaGetOrderPersistence } from './infrastructure/persistence/prisma-get-order.persistence';
import { PrismaListOrdersPersistence } from './infrastructure/persistence/prisma-list-orders.persistence';
import { PrismaReceiveOrderPersistence } from './infrastructure/persistence/prisma-receive-order.persistence';
import { PrismaUpdateOrderPersistence } from './infrastructure/persistence/prisma-update-order.persistence';
import { OrdersController } from './presentation/orders.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [
    PrismaCancelOrderPersistence,
    PrismaCreateOrderPersistence,
    PrismaGetOrderPersistence,
    PrismaListOrdersPersistence,
    PrismaReceiveOrderPersistence,
    PrismaUpdateOrderPersistence,
    {
      provide: CANCEL_ORDER_PERSISTENCE,
      useExisting: PrismaCancelOrderPersistence,
    },
    {
      provide: CREATE_ORDER_PERSISTENCE,
      useExisting: PrismaCreateOrderPersistence,
    },
    {
      provide: GET_ORDER_PERSISTENCE,
      useExisting: PrismaGetOrderPersistence,
    },
    {
      provide: LIST_ORDERS_PERSISTENCE,
      useExisting: PrismaListOrdersPersistence,
    },
    {
      provide: RECEIVE_ORDER_PERSISTENCE,
      useExisting: PrismaReceiveOrderPersistence,
    },
    {
      provide: UPDATE_ORDER_PERSISTENCE,
      useExisting: PrismaUpdateOrderPersistence,
    },
    {
      provide: CancelOrderUseCase,
      inject: [CANCEL_ORDER_PERSISTENCE],
      useFactory: (persistence: CancelOrderPersistence) =>
        new CancelOrderUseCase(persistence),
    },
    {
      provide: CreateOrderUseCase,
      inject: [CREATE_ORDER_PERSISTENCE],
      useFactory: (persistence: CreateOrderPersistence) =>
        new CreateOrderUseCase(persistence),
    },
    {
      provide: GetOrderUseCase,
      inject: [GET_ORDER_PERSISTENCE],
      useFactory: (persistence: GetOrderPersistence) =>
        new GetOrderUseCase(persistence),
    },
    {
      provide: ListOrdersUseCase,
      inject: [LIST_ORDERS_PERSISTENCE],
      useFactory: (persistence: ListOrdersPersistence) =>
        new ListOrdersUseCase(persistence),
    },
    {
      provide: ReceiveOrderUseCase,
      inject: [RECEIVE_ORDER_PERSISTENCE],
      useFactory: (persistence: ReceiveOrderPersistence) =>
        new ReceiveOrderUseCase(persistence),
    },
    {
      provide: UpdateOrderUseCase,
      inject: [UPDATE_ORDER_PERSISTENCE],
      useFactory: (persistence: UpdateOrderPersistence) =>
        new UpdateOrderUseCase(persistence),
    },
  ],
})
export class OrdersModule {}
