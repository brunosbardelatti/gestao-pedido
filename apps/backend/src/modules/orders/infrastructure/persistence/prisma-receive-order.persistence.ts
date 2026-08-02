import { Inject, Injectable } from '@nestjs/common';
import {
  ActorType,
  IdempotencyStatus,
  InventoryMovementType,
  OrderStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { PersistedOrder } from '../../application/ports/create-order-persistence';
import type {
  ReceiveOrderPersistence,
  ReceiveOrderPersistenceInput,
  ReceiveOrderPersistenceResult,
} from '../../application/ports/receive-order-persistence';
import { orderRelations, serializeOrder } from './order-persistence.mapper';

@Injectable()
export class PrismaReceiveOrderPersistence implements ReceiveOrderPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async receiveIdempotently(
    input: ReceiveOrderPersistenceInput,
  ): Promise<ReceiveOrderPersistenceResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.idempotencyRecord.findUnique({
          where: {
            scope_key: {
              scope: input.idempotencyScope,
              key: input.idempotencyKey,
            },
          },
        });
        if (existing && existing.expiresAt > new Date()) {
          return this.resolveExisting(existing, input.requestHash);
        }
        if (existing) {
          await transaction.idempotencyRecord.delete({
            where: { id: existing.id },
          });
        }

        const currentOrder = await transaction.order.findUnique({
          where: { id: input.orderId },
          select: {
            status: true,
            items: {
              select: {
                id: true,
                productId: true,
                quantityOrdered: true,
              },
            },
          },
        });
        if (!currentOrder) return { status: 'not_found' };
        if (currentOrder.status !== OrderStatus.OPEN) {
          return { status: 'not_receivable' };
        }

        const requestedIds = new Set(
          input.items.map((item) => item.orderItemId),
        );
        if (
          requestedIds.size !== currentOrder.items.length ||
          currentOrder.items.some((item) => !requestedIds.has(item.id))
        ) {
          return { status: 'items_mismatch' };
        }
        const currentItems = new Map(
          currentOrder.items.map((item) => [item.id, item]),
        );
        if (
          input.items.some(
            (item) =>
              item.quantityReceived >
              (currentItems.get(item.orderItemId)?.quantityOrdered ?? -1),
          )
        ) {
          return { status: 'quantity_exceeded' };
        }

        const idempotencyRecord = await transaction.idempotencyRecord.create({
          data: {
            key: input.idempotencyKey,
            scope: input.idempotencyScope,
            requestHash: input.requestHash,
            status: IdempotencyStatus.PROCESSING,
            actorType: ActorType.USER,
            userId: input.actorId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        const receivedAt = new Date();
        const transition = await transaction.order.updateMany({
          where: { id: input.orderId, status: OrderStatus.OPEN },
          data: {
            status: OrderStatus.RECEIVED,
            receivedAt,
            receivedById: input.actorId,
            updatedById: input.actorId,
          },
        });
        if (transition.count === 0) {
          await transaction.idempotencyRecord.delete({
            where: { id: idempotencyRecord.id },
          });
          return { status: 'not_receivable' };
        }

        for (const item of input.items) {
          const currentItem = currentItems.get(item.orderItemId);
          if (!currentItem) {
            throw new Error('Validated order item is missing.');
          }

          await transaction.orderItem.update({
            where: { id: item.orderItemId },
            data: {
              quantityReceived: item.quantityReceived,
              expirationDate: item.expirationDate
                ? new Date(`${item.expirationDate}T00:00:00.000Z`)
                : null,
              notes: item.notes,
            },
          });
          if (item.quantityReceived > 0) {
            await transaction.inventoryMovement.create({
              data: {
                productId: currentItem.productId,
                orderItemId: item.orderItemId,
                type: InventoryMovementType.PURCHASE,
                quantityDelta: item.quantityReceived,
                createdById: input.actorId,
              },
            });
          }
        }

        const persisted = await transaction.order.findUniqueOrThrow({
          where: { id: input.orderId },
          include: orderRelations,
        });
        const order = serializeOrder(persisted);
        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: 'ORDER_RECEIVED',
            entityType: 'Order',
            entityId: input.orderId,
            requestId: input.requestId,
          },
        });
        await transaction.idempotencyRecord.update({
          where: { id: idempotencyRecord.id },
          data: {
            status: IdempotencyStatus.COMPLETED,
            responseStatus: 200,
            responseBody: order as unknown as Prisma.InputJsonValue,
          },
        });

        return { status: 'received', order };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.idempotencyRecord.findUnique({
          where: {
            scope_key: {
              scope: input.idempotencyScope,
              key: input.idempotencyKey,
            },
          },
        });
        if (existing) return this.resolveExisting(existing, input.requestHash);
      }

      throw error;
    }
  }

  private resolveExisting(
    record: {
      requestHash: string;
      status: IdempotencyStatus;
      responseBody: Prisma.JsonValue | null;
    },
    requestHash: string,
  ): ReceiveOrderPersistenceResult {
    if (record.requestHash !== requestHash) {
      return { status: 'idempotency_conflict' };
    }
    if (
      record.status === IdempotencyStatus.COMPLETED &&
      record.responseBody &&
      typeof record.responseBody === 'object' &&
      !Array.isArray(record.responseBody)
    ) {
      return {
        status: 'replayed',
        order: record.responseBody as unknown as PersistedOrder,
      };
    }

    return { status: 'idempotency_in_progress' };
  }
}
