import { Inject, Injectable } from '@nestjs/common';
import {
  ActorType,
  IdempotencyStatus,
  InventoryMovementType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateSalePersistence,
  CreateSalePersistenceInput,
  CreateSalePersistenceResult,
  PersistedSale,
} from '../../application/ports/create-sale-persistence';
import { saleRelations, serializeSale } from './sale-persistence.mapper';

@Injectable()
export class PrismaCreateSalePersistence implements CreateSalePersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createIdempotently(
    input: CreateSalePersistenceInput,
  ): Promise<CreateSalePersistenceResult> {
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
          await transaction.idempotencyRecord.delete({ where: { id: existing.id } });
        }

        if (input.customerId) {
          const customer = await transaction.customer.findUnique({
            where: { id: input.customerId },
            select: { active: true },
          });
          if (!customer) return { status: 'customer_not_found' };
          if (!customer.active) return { status: 'customer_inactive' };
        }

        const productIds = [...input.items.map((item) => item.productId)].sort();
        const productIdParameters = productIds.map(
          (productId) => Prisma.sql`${productId}::uuid`,
        );
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(
            productIdParameters,
          )}) ORDER BY id FOR UPDATE`,
        );
        const products = await transaction.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, active: true, purchasePrice: true },
        });
        if (products.length !== productIds.length) return { status: 'product_not_found' };
        if (products.some((product) => !product.active)) {
          return { status: 'product_inactive' };
        }

        const balances = await transaction.inventoryMovement.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _sum: { quantityDelta: true },
        });
        const balanceByProduct = new Map(
          balances.map((balance) => [balance.productId, balance._sum.quantityDelta ?? 0]),
        );
        if (
          !input.confirmNegativeStock &&
          input.items.some(
            (item) =>
              (balanceByProduct.get(item.productId) ?? 0) - item.quantity < 0,
          )
        ) {
          return { status: 'negative_stock_confirmation_required' };
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
        const costByProduct = new Map(
          products.map((product) => [product.id, product.purchasePrice.toFixed(2)]),
        );
        const created = await transaction.sale.create({
          data: {
            customerId: input.customerId,
            paymentMethod: input.paymentMethod,
            total: input.total,
            notes: input.notes,
            createdById: input.actorId,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCostSnapshot: costByProduct.get(item.productId)!,
                subtotal: item.subtotal,
              })),
            },
          },
          include: saleRelations,
        });
        await transaction.inventoryMovement.createMany({
          data: created.items.map((item) => ({
            productId: item.productId,
            saleItemId: item.id,
            type: InventoryMovementType.SALE,
            quantityDelta: -item.quantity,
            createdById: input.actorId,
          })),
        });
        const sale = serializeSale(created);

        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: 'SALE_CREATED',
            entityType: 'Sale',
            entityId: created.id,
            requestId: input.requestId,
            metadata: {
              total: input.total,
              confirmNegativeStock: input.confirmNegativeStock,
            },
          },
        });
        await transaction.idempotencyRecord.update({
          where: { id: idempotencyRecord.id },
          data: {
            status: IdempotencyStatus.COMPLETED,
            responseStatus: 201,
            responseBody: sale as unknown as Prisma.InputJsonValue,
          },
        });
        return { status: 'created', sale };
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
  ): CreateSalePersistenceResult {
    if (record.requestHash !== requestHash) return { status: 'idempotency_conflict' };
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
