import { InvalidOrderDateError } from '../errors/invalid-order-date.error';

export class OrderDate {
  private constructor(readonly value: string) {}

  static create(input: string): OrderDate {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      throw new InvalidOrderDateError();
    }

    const date = new Date(`${input}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) {
      throw new InvalidOrderDateError();
    }

    return new OrderDate(input);
  }
}
