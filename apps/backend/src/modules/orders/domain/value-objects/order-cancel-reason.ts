import { InvalidOrderCancelReasonError } from '../errors/invalid-order-cancel-reason.error';

export class OrderCancelReason {
  private constructor(readonly value: string) {}

  static create(value: string): OrderCancelReason {
    const normalized = value.normalize('NFKC').trim();
    if (normalized.length === 0 || normalized.length > 500) {
      throw new InvalidOrderCancelReasonError();
    }

    return new OrderCancelReason(normalized);
  }
}
