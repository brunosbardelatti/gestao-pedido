import { ProductPrice } from '../../products/domain/value-objects/product-price';
import { DuplicateOrderProductError } from '../domain/errors/duplicate-order-product.error';
import { InvalidOrderItemError } from '../domain/errors/invalid-order-item.error';
import { OrderCycle } from '../domain/value-objects/order-cycle';
import { OrderDate } from '../domain/value-objects/order-date';
import { OrderNotes } from '../domain/value-objects/order-notes';

export interface OrderItemInput {
  productId: string;
  quantityOrdered: number;
  catalogUnitPrice: string;
  purchaseUnitPrice: string;
  originalUnitPrice: string;
  notes?: string | null;
}

export interface OrderAggregateInput {
  brandId: string;
  cycle: string;
  orderDate: string;
  notes?: string | null;
  items: OrderItemInput[];
}

export interface NormalizedOrderItem {
  productId: string;
  quantityOrdered: number;
  catalogUnitPrice: string;
  purchaseUnitPrice: string;
  originalUnitPrice: string;
  notes: string | null;
}

export interface NormalizedOrderAggregate {
  brandId: string;
  cycle: string;
  orderDate: string;
  notes: string | null;
  items: NormalizedOrderItem[];
}

export function normalizeOrderInput(
  input: OrderAggregateInput,
): NormalizedOrderAggregate {
  if (input.items.length === 0) throw new InvalidOrderItemError();

  const productIds = new Set<string>();
  const items = input.items.map((item) => {
    if (!Number.isInteger(item.quantityOrdered) || item.quantityOrdered < 1) {
      throw new InvalidOrderItemError();
    }
    if (productIds.has(item.productId)) {
      throw new DuplicateOrderProductError();
    }
    productIds.add(item.productId);

    return {
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
      catalogUnitPrice: ProductPrice.create(item.catalogUnitPrice).value,
      purchaseUnitPrice: ProductPrice.create(item.purchaseUnitPrice).value,
      originalUnitPrice: ProductPrice.create(item.originalUnitPrice).value,
      notes: OrderNotes.createOptional(item.notes, 500)?.value ?? null,
    };
  });

  return {
    brandId: input.brandId,
    cycle: OrderCycle.create(input.cycle).value,
    orderDate: OrderDate.create(input.orderDate).value,
    notes: OrderNotes.createOptional(input.notes)?.value ?? null,
    items,
  };
}
