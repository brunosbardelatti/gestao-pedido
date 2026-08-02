import { createHash } from 'node:crypto';

import { BrandNotFoundError } from '../../../brands/domain/errors/brand-not-found.error';
import { ProductNotFoundError } from '../../../products/domain/errors/product-not-found.error';
import { ProductPrice } from '../../../products/domain/value-objects/product-price';
import { DuplicateOrderProductError } from '../../domain/errors/duplicate-order-product.error';
import { IdempotencyKeyConflictError } from '../../domain/errors/idempotency-key-conflict.error';
import { IdempotencyRequestInProgressError } from '../../domain/errors/idempotency-request-in-progress.error';
import { InvalidOrderItemError } from '../../domain/errors/invalid-order-item.error';
import { OrderBrandInactiveError } from '../../domain/errors/order-brand-inactive.error';
import { OrderBrandMismatchError } from '../../domain/errors/order-brand-mismatch.error';
import { OrderProductInactiveError } from '../../domain/errors/order-product-inactive.error';
import { OrderCycle } from '../../domain/value-objects/order-cycle';
import { OrderDate } from '../../domain/value-objects/order-date';
import { OrderNotes } from '../../domain/value-objects/order-notes';
import type {
  CreateOrderPersistence,
  PersistedOrder,
} from '../ports/create-order-persistence';

export interface CreateOrderItemInput {
  productId: string;
  quantityOrdered: number;
  catalogUnitPrice: string;
  purchaseUnitPrice: string;
  originalUnitPrice: string;
  notes?: string | null;
}

export interface CreateOrderInput {
  actorId: string;
  idempotencyKey: string;
  brandId: string;
  cycle: string;
  orderDate: string;
  notes?: string | null;
  items: CreateOrderItemInput[];
  requestId?: string;
}

export class CreateOrderUseCase {
  constructor(private readonly persistence: CreateOrderPersistence) {}

  async execute(input: CreateOrderInput): Promise<PersistedOrder> {
    if (input.items.length === 0) throw new InvalidOrderItemError();

    const productIds = new Set<string>();
    const items = input.items.map((item) => {
      if (
        !Number.isInteger(item.quantityOrdered) ||
        item.quantityOrdered < 1
      ) {
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
    const normalized = {
      brandId: input.brandId,
      cycle: OrderCycle.create(input.cycle).value,
      orderDate: OrderDate.create(input.orderDate).value,
      notes: OrderNotes.createOptional(input.notes)?.value ?? null,
      items,
    };
    const requestHash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
    const result = await this.persistence.createIdempotently({
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      idempotencyScope: `orders:create:user:${input.actorId}`,
      requestHash,
      ...normalized,
      requestId: input.requestId,
    });

    if (result.status === 'brand_not_found') throw new BrandNotFoundError();
    if (result.status === 'product_not_found') throw new ProductNotFoundError();
    if (result.status === 'brand_inactive') {
      throw new OrderBrandInactiveError();
    }
    if (result.status === 'product_inactive') {
      throw new OrderProductInactiveError();
    }
    if (result.status === 'brand_mismatch') {
      throw new OrderBrandMismatchError();
    }
    if (result.status === 'idempotency_conflict') {
      throw new IdempotencyKeyConflictError();
    }
    if (result.status === 'idempotency_in_progress') {
      throw new IdempotencyRequestInProgressError();
    }

    return result.order;
  }
}
