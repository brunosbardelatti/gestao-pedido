import { createHash } from 'node:crypto';

import { BrandNotFoundError } from '../../../brands/domain/errors/brand-not-found.error';
import { ProductNotFoundError } from '../../../products/domain/errors/product-not-found.error';
import { IdempotencyKeyConflictError } from '../../domain/errors/idempotency-key-conflict.error';
import { IdempotencyRequestInProgressError } from '../../domain/errors/idempotency-request-in-progress.error';
import { OrderBrandInactiveError } from '../../domain/errors/order-brand-inactive.error';
import { OrderBrandMismatchError } from '../../domain/errors/order-brand-mismatch.error';
import { OrderProductInactiveError } from '../../domain/errors/order-product-inactive.error';
import type {
  CreateOrderPersistence,
  PersistedOrder,
} from '../ports/create-order-persistence';
import {
  normalizeOrderInput,
  type OrderItemInput,
} from '../normalize-order-input';

export type CreateOrderItemInput = OrderItemInput;

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
    const normalized = normalizeOrderInput(input);
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
