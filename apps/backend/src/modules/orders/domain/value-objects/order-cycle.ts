import { InvalidOrderCycleError } from '../errors/invalid-order-cycle.error';

export class OrderCycle {
  private constructor(readonly value: string) {}

  static create(input: string): OrderCycle {
    const value = input.normalize('NFKC').trim();
    if (!/^\d{2}\/\d{4}$/.test(value)) {
      throw new InvalidOrderCycleError();
    }

    return new OrderCycle(value);
  }
}
