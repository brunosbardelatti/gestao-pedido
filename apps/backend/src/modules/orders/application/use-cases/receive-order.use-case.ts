import { createHash } from 'node:crypto';

import { DuplicateReceiptItemError } from '../../domain/errors/duplicate-receipt-item.error';
import { IdempotencyKeyConflictError } from '../../domain/errors/idempotency-key-conflict.error';
import { IdempotencyRequestInProgressError } from '../../domain/errors/idempotency-request-in-progress.error';
import { InvalidReceiptItemError } from '../../domain/errors/invalid-receipt-item.error';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { OrderNotReceivableError } from '../../domain/errors/order-not-receivable.error';
import { OrderReceiptItemsMismatchError } from '../../domain/errors/order-receipt-items-mismatch.error';
import { ReceivedQuantityExceededError } from '../../domain/errors/received-quantity-exceeded.error';
import { ExpirationDate } from '../../domain/value-objects/expiration-date';
import { OrderNotes } from '../../domain/value-objects/order-notes';
import type { PersistedOrder } from '../ports/create-order-persistence';
import type { ReceiveOrderPersistence } from '../ports/receive-order-persistence';

export interface ReceiveOrderItemInput {
  orderItemId: string;
  quantityReceived: number;
  expirationDate?: string | null;
  notes?: string | null;
}

export interface ReceiveOrderInput {
  actorId: string;
  orderId: string;
  idempotencyKey: string;
  items: ReceiveOrderItemInput[];
  requestId?: string;
}

export class ReceiveOrderUseCase {
  constructor(private readonly persistence: ReceiveOrderPersistence) {}

  async execute(input: ReceiveOrderInput): Promise<PersistedOrder> {
    if (input.items.length === 0) throw new InvalidReceiptItemError();

    const itemIds = new Set<string>();
    const items = input.items.map((item) => {
      if (
        !Number.isInteger(item.quantityReceived) ||
        item.quantityReceived < 0
      ) {
        throw new InvalidReceiptItemError();
      }
      if (itemIds.has(item.orderItemId)) {
        throw new DuplicateReceiptItemError();
      }
      itemIds.add(item.orderItemId);

      return {
        orderItemId: item.orderItemId,
        quantityReceived: item.quantityReceived,
        expirationDate:
          ExpirationDate.createOptional(item.expirationDate)?.value ?? null,
        notes: OrderNotes.createOptional(item.notes, 500)?.value ?? null,
      };
    });
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ orderId: input.orderId, items }))
      .digest('hex');
    const result = await this.persistence.receiveIdempotently({
      actorId: input.actorId,
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
      idempotencyScope: `orders:receive:user:${input.actorId}`,
      requestHash,
      items,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') throw new OrderNotFoundError();
    if (result.status === 'not_receivable') {
      throw new OrderNotReceivableError();
    }
    if (result.status === 'items_mismatch') {
      throw new OrderReceiptItemsMismatchError();
    }
    if (result.status === 'quantity_exceeded') {
      throw new ReceivedQuantityExceededError();
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
