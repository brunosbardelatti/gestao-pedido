import { OrderNotCancelableError } from '../../domain/errors/order-not-cancelable.error';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { OrderCancelReason } from '../../domain/value-objects/order-cancel-reason';
import type { CancelOrderPersistence } from '../ports/cancel-order-persistence';
import type { PersistedOrder } from '../ports/create-order-persistence';

export interface CancelOrderInput {
  actorId: string;
  orderId: string;
  reason: string;
  requestId?: string;
}

export class CancelOrderUseCase {
  constructor(private readonly persistence: CancelOrderPersistence) {}

  async execute(input: CancelOrderInput): Promise<PersistedOrder> {
    const result = await this.persistence.cancelWithAudit({
      actorId: input.actorId,
      orderId: input.orderId,
      reason: OrderCancelReason.create(input.reason).value,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') throw new OrderNotFoundError();
    if (result.status === 'not_cancelable') {
      throw new OrderNotCancelableError();
    }

    return result.order;
  }
}
