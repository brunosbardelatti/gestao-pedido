import type { Prisma } from '@prisma/client';

import type { PersistedSale } from '../../application/ports/create-sale-persistence';

export const saleRelations = {
  customer: {
    select: {
      id: true,
      name: true,
      cpf: true,
      phone: true,
      addressLine: true,
      city: true,
      state: true,
      postalCode: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  items: {
    include: {
      product: { select: { code: true, description: true } },
    },
  },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleRelations }>;

export function serializeSale(sale: SaleWithRelations): PersistedSale {
  return {
    id: sale.id,
    customer: sale.customer
      ? {
          ...sale.customer,
          createdAt: sale.customer.createdAt.toISOString(),
          updatedAt: sale.customer.updatedAt.toISOString(),
        }
      : null,
    status: sale.status,
    saleDate: sale.saleDate.toISOString(),
    paymentMethod: sale.paymentMethod,
    total: sale.total.toFixed(2),
    notes: sale.notes,
    canceledAt: sale.canceledAt?.toISOString() ?? null,
    cancelReason: sale.cancelReason,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: item.product.code,
      productDescription: item.product.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      unitCostSnapshot: item.unitCostSnapshot.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    })),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}
