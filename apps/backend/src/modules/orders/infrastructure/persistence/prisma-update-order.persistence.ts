import { Inject, Injectable } from '@nestjs/common';
import { ActorType, OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  UpdateOrderPersistence,
  UpdateOrderPersistenceInput,
  UpdateOrderPersistenceResult,
} from '../../application/ports/update-order-persistence';
import { orderRelations, serializeOrder } from './order-persistence.mapper';

@Injectable()
export class PrismaUpdateOrderPersistence implements UpdateOrderPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateWithAudit(
    input: UpdateOrderPersistenceInput,
  ): Promise<UpdateOrderPersistenceResult> {
    return this.prisma.$transaction(async (transaction) => {
      const currentOrder = await transaction.order.findUnique({
        where: { id: input.orderId },
        select: { status: true },
      });
      if (!currentOrder) return { status: 'not_found' };
      if (currentOrder.status !== OrderStatus.OPEN) {
        return { status: 'not_editable' };
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

      await transaction.orderItem.deleteMany({
        where: { orderId: input.orderId },
      });
      const order = await transaction.order.update({
        where: { id: input.orderId },
        data: {
          brandId: input.brandId,
          cycle: input.cycle,
          orderDate: new Date(`${input.orderDate}T00:00:00.000Z`),
          notes: input.notes,
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
        include: orderRelations,
      });

      await transaction.auditLog.create({
        data: {
          actorType: ActorType.USER,
          userId: input.actorId,
          action: 'ORDER_UPDATED',
          entityType: 'Order',
          entityId: order.id,
          requestId: input.requestId,
        },
      });

      return { status: 'updated', order: serializeOrder(order) };
    });
  }
}
