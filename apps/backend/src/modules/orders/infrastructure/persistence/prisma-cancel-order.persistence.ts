import { Inject, Injectable } from '@nestjs/common';
import { ActorType, OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CancelOrderPersistence,
  CancelOrderPersistenceInput,
  CancelOrderPersistenceResult,
} from '../../application/ports/cancel-order-persistence';
import { orderRelations, serializeOrder } from './order-persistence.mapper';

@Injectable()
export class PrismaCancelOrderPersistence implements CancelOrderPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async cancelWithAudit(
    input: CancelOrderPersistenceInput,
  ): Promise<CancelOrderPersistenceResult> {
    return this.prisma.$transaction(async (transaction) => {
      const currentOrder = await transaction.order.findUnique({
        where: { id: input.orderId },
        select: { status: true },
      });
      if (!currentOrder) return { status: 'not_found' };
      if (currentOrder.status !== OrderStatus.OPEN) {
        return { status: 'not_cancelable' };
      }

      const transition = await transaction.order.updateMany({
        where: { id: input.orderId, status: OrderStatus.OPEN },
        data: {
          status: OrderStatus.CANCELED,
          canceledAt: new Date(),
          canceledById: input.actorId,
          cancelReason: input.reason,
          updatedById: input.actorId,
        },
      });
      if (transition.count === 0) return { status: 'not_cancelable' };

      const persisted = await transaction.order.findUniqueOrThrow({
        where: { id: input.orderId },
        include: orderRelations,
      });
      await transaction.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.actorId,
          action: 'ORDER_CANCELED',
          entityType: 'Order',
          entityId: input.orderId,
          requestId: input.requestId,
        },
      });

      return { status: 'canceled', order: serializeOrder(persisted) };
    });
  }
}
