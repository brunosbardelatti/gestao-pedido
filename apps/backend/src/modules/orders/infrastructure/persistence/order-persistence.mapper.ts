import type { Prisma } from '@prisma/client';

import type { PersistedOrder } from '../../application/ports/create-order-persistence';

export const orderRelations = {
  brand: true,
  items: { include: { product: true } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderRelations;
}>;

export function serializeOrder(order: OrderWithRelations): PersistedOrder {
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
