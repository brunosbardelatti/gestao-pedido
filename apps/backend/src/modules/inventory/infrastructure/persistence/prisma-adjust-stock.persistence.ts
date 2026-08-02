import { Inject, Injectable } from '@nestjs/common';
import {
  ActorType,
  IdempotencyStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  AdjustStockPersistence,
  AdjustStockPersistenceInput,
  AdjustStockPersistenceResult,
} from '../../application/ports/adjust-stock-persistence';
import type { InventoryMovementRecord } from '../../application/ports/list-inventory-movements-persistence';

const movementWithCreator = {
  id: true,
  productId: true,
  type: true,
  quantityDelta: true,
  reason: true,
  orderItemId: true,
  saleItemId: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      login: true,
      role: true,
      active: true,
    },
  },
  createdAt: true,
} satisfies Prisma.InventoryMovementSelect;

type MovementWithCreator = Prisma.InventoryMovementGetPayload<{
  select: typeof movementWithCreator;
}>;

@Injectable()
export class PrismaAdjustStockPersistence implements AdjustStockPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async adjustIdempotently(
    input: AdjustStockPersistenceInput,
  ): Promise<AdjustStockPersistenceResult> {
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

        const product = await transaction.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM products WHERE id = ${input.productId}::uuid FOR UPDATE`,
        );
        if (product.length === 0) return { status: 'not_found' };

        const aggregate = await transaction.inventoryMovement.aggregate({
          where: { productId: input.productId },
          _sum: { quantityDelta: true },
        });
        const resultingBalance =
          (aggregate._sum.quantityDelta ?? 0) + input.quantityDelta;
        if (resultingBalance < 0 && !input.confirmNegativeStock) {
          return { status: 'negative_confirmation_required' };
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
        const persisted = await transaction.inventoryMovement.create({
          data: {
            productId: input.productId,
            type: input.type,
            quantityDelta: input.quantityDelta,
            reason: input.reason,
            createdById: input.actorId,
          },
          select: movementWithCreator,
        });
        const movement = this.serialize(persisted);

        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: 'INVENTORY_ADJUSTED',
            entityType: 'InventoryMovement',
            entityId: movement.id,
            requestId: input.requestId,
            metadata: {
              productId: input.productId,
              type: input.type,
              quantityDelta: input.quantityDelta,
              resultingBalance,
            },
          },
        });
        await transaction.idempotencyRecord.update({
          where: { id: idempotencyRecord.id },
          data: {
            status: IdempotencyStatus.COMPLETED,
            responseStatus: 201,
            responseBody: movement as unknown as Prisma.InputJsonValue,
          },
        });

        return { status: 'created', movement };
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

  private serialize(movement: MovementWithCreator): InventoryMovementRecord {
    return {
      ...movement,
      createdAt: movement.createdAt.toISOString(),
    };
  }

  private resolveExisting(
    record: {
      requestHash: string;
      status: IdempotencyStatus;
      responseBody: Prisma.JsonValue | null;
    },
    requestHash: string,
  ): AdjustStockPersistenceResult {
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
        movement: record.responseBody as unknown as InventoryMovementRecord,
      };
    }

    return { status: 'idempotency_in_progress' };
  }
}
