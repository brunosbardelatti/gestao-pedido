import { Inject, Injectable } from '@nestjs/common';
import {
  ActorType,
  IdempotencyStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateOrderPersistence,
  CreateOrderPersistenceInput,
  CreateOrderPersistenceResult,
  PersistedOrder,
} from '../../application/ports/create-order-persistence';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    brand: true;
    items: { include: { product: true } };
  };
}>;

@Injectable()
export class PrismaCreateOrderPersistence implements CreateOrderPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createIdempotently(
    input: CreateOrderPersistenceInput,
  ): Promise<CreateOrderPersistenceResult> {
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

        const brand = await transaction.brand.findUnique({
          where: { id: input.brandId },
          select: { active: true },
        });
        if (!brand) return { status: 'brand_not_found' };
        if (!brand.active) return { status: 'brand_inactive' };

        const productIds = input.items.map((item) => item.productId);
        const products = await transaction.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, brandId: true, active: true },
        });
        if (products.length !== productIds.length) {
          return { status: 'product_not_found' };
        }
        if (products.some((product) => !product.active)) {
          return { status: 'product_inactive' };
        }
        if (products.some((product) => product.brandId !== input.brandId)) {
          return { status: 'brand_mismatch' };
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
        const created = await transaction.order.create({
          data: {
            brandId: input.brandId,
            cycle: input.cycle,
            orderDate: new Date(`${input.orderDate}T00:00:00.000Z`),
            notes: input.notes,
            createdById: input.actorId,
            updatedById: input.actorId,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                quantityOrdered: item.quantityOrdered,
                catalogUnitPrice: item.catalogUnitPrice,
                purchaseUnitPrice: item.purchaseUnitPrice,
                originalUnitPrice: item.originalUnitPrice,
                notes: item.notes,
              })),
            },
          },
          include: {
            brand: true,
            items: { include: { product: true } },
          },
        });
        const order = this.serialize(created);

        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: 'ORDER_CREATED',
            entityType: 'Order',
            entityId: created.id,
            requestId: input.requestId,
          },
        });
        await transaction.idempotencyRecord.update({
          where: { id: idempotencyRecord.id },
          data: {
            status: IdempotencyStatus.COMPLETED,
            responseStatus: 201,
            responseBody: order as unknown as Prisma.InputJsonValue,
          },
        });

        return { status: 'created', order };
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
  ): CreateOrderPersistenceResult {
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

  private serialize(order: OrderWithRelations): PersistedOrder {
    return {
      id: order.id,
      brand: {
        id: order.brand.id,
        name: order.brand.name,
        active: order.brand.active,
        createdAt: order.brand.createdAt.toISOString(),
        updatedAt: order.brand.updatedAt.toISOString(),
      },
      cycle: order.cycle,
      orderDate: order.orderDate.toISOString().slice(0, 10),
      receivedAt: order.receivedAt?.toISOString() ?? null,
      canceledAt: order.canceledAt?.toISOString() ?? null,
      cancelReason: order.cancelReason,
      status: order.status,
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productCode: item.product.code,
        productDescription: item.product.description,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: item.quantityReceived,
        catalogUnitPrice: item.catalogUnitPrice.toFixed(2),
        purchaseUnitPrice: item.purchaseUnitPrice.toFixed(2),
        originalUnitPrice: item.originalUnitPrice.toFixed(2),
        expirationDate: item.expirationDate?.toISOString().slice(0, 10) ?? null,
        notes: item.notes,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
