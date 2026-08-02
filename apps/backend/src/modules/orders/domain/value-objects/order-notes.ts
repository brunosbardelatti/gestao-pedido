import { InvalidOrderNotesError } from '../errors/invalid-order-notes.error';

export class OrderNotes {
  private constructor(readonly value: string) {}

  static createOptional(
    input: string | null | undefined,
    maxLength?: number,
  ): OrderNotes | null {
    if (input === undefined || input === null) return null;

    const value = input.normalize('NFKC').trim();
    if (value.length === 0) return null;
    if (maxLength !== undefined && value.length > maxLength) {
      throw new InvalidOrderNotesError();
    }

    return new OrderNotes(value);
  }
}
