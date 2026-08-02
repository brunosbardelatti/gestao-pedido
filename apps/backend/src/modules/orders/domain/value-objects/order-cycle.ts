import { InvalidOrderCycleError } from '../errors/invalid-order-cycle.error';

export class OrderCycle {
  private constructor(readonly value: string) {}

  static create(input: string): OrderCycle {
    const value = input.normalize('NFKC').trim();
    if (value.length === 0 || value.length > 80) {
      throw new InvalidOrderCycleError();
    }

    return new OrderCycle(value);
  }
}
