import { Inject, Injectable } from '@nestjs/common';
import {
  ActorType,
  IdempotencyStatus,
  InventoryMovementType,
  Prisma,
  SaleStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CancelSalePersistence,
  CancelSalePersistenceInput,
  CancelSalePersistenceResult,
} from '../../application/ports/cancel-sale-persistence';
import type { PersistedSale } from '../../application/ports/create-sale-persistence';
import { saleRelations, serializeSale } from './sale-persistence.mapper';

@Injectable()
export class PrismaCancelSalePersistence implements CancelSalePersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async cancelIdempotently(
    input: CancelSalePersistenceInput,
  ): Promise<CancelSalePersistenceResult> {
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
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM sales WHERE id = ${input.saleId}::uuid FOR UPDATE`,
        );
        const currentSale = await transaction.sale.findUnique({
          where: { id: input.saleId },
          select: {
            status: true,
            items: { select: { id: true, productId: true, quantity: true } },
          },
        });
        if (!currentSale) {
          await transaction.idempotencyRecord.delete({
            where: { id: idempotencyRecord.id },
          });
          return { status: 'not_found' };
        }
        if (currentSale.status !== SaleStatus.COMPLETED) {
          await transaction.idempotencyRecord.delete({
            where: { id: idempotencyRecord.id },
          });
          return { status: 'not_cancelable' };
        }

        const canceledAt = new Date();
        const transition = await transaction.sale.updateMany({
          where: { id: input.saleId, status: SaleStatus.COMPLETED },
          data: {
            status: SaleStatus.CANCELED,
            canceledAt,
            canceledById: input.actorId,
            cancelReason: input.reason,
          },
        });
        if (transition.count === 0) {
          await transaction.idempotencyRecord.delete({
            where: { id: idempotencyRecord.id },
          });
          return { status: 'not_cancelable' };
        }

        await transaction.inventoryMovement.createMany({
          data: currentSale.items.map((item) => ({
            productId: item.productId,
            saleItemId: item.id,
            type: InventoryMovementType.SALE_CANCELLATION,
            quantityDelta: item.quantity,
            reason: input.reason,
            createdById: input.actorId,
          })),
        });
        const persisted = await transaction.sale.findUniqueOrThrow({
          where: { id: input.saleId },
          include: saleRelations,
        });
        const sale = serializeSale(persisted);
        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: 'SALE_CANCELED',
            entityType: 'Sale',
            entityId: input.saleId,
            requestId: input.requestId,
          },
        });
        await transaction.idempotencyRecord.update({
          where: { id: idempotencyRecord.id },
          data: {
            status: IdempotencyStatus.COMPLETED,
            responseStatus: 200,
            responseBody: sale as unknown as Prisma.InputJsonValue,
          },
        });
        return { status: 'canceled', sale };
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
  ): CancelSalePersistenceResult {
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
        sale: record.responseBody as unknown as PersistedSale,
      };
    }
    return { status: 'idempotency_in_progress' };
  }
}
