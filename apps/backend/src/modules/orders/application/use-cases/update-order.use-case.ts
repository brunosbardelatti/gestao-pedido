import { BrandNotFoundError } from '../../../brands/domain/errors/brand-not-found.error';
import { ProductNotFoundError } from '../../../products/domain/errors/product-not-found.error';
import { OrderBrandInactiveError } from '../../domain/errors/order-brand-inactive.error';
import { OrderBrandMismatchError } from '../../domain/errors/order-brand-mismatch.error';
import { OrderNotEditableError } from '../../domain/errors/order-not-editable.error';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { OrderProductInactiveError } from '../../domain/errors/order-product-inactive.error';
import {
  normalizeOrderInput,
  type OrderAggregateInput,
} from '../normalize-order-input';
import type { PersistedOrder } from '../ports/create-order-persistence';
import type { UpdateOrderPersistence } from '../ports/update-order-persistence';

export interface UpdateOrderInput extends OrderAggregateInput {
  actorId: string;
  orderId: string;
  requestId?: string;
}

export class UpdateOrderUseCase {
  constructor(private readonly persistence: UpdateOrderPersistence) {}

  async execute(input: UpdateOrderInput): Promise<PersistedOrder> {
    const result = await this.persistence.updateWithAudit({
      actorId: input.actorId,
      orderId: input.orderId,
      ...normalizeOrderInput(input),
      requestId: input.requestId,
    });

    if (result.status === 'not_found') throw new OrderNotFoundError();
    if (result.status === 'not_editable') throw new OrderNotEditableError();
    if (result.status === 'brand_not_found') throw new BrandNotFoundError();
    if (result.status === 'brand_inactive') {
      throw new OrderBrandInactiveError();
    }
    if (result.status === 'product_not_found') throw new ProductNotFoundError();
    if (result.status === 'product_inactive') {
      throw new OrderProductInactiveError();
    }
    if (result.status === 'brand_mismatch') {
      throw new OrderBrandMismatchError();
    }

    return result.order;
  }
}
