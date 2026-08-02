import { InvalidSaleCancelReasonError } from '../errors/invalid-sale-cancel-reason.error';

export class SaleCancelReason {
  private constructor(readonly value: string) {}

  static create(value: string): SaleCancelReason {
    const normalized = value.normalize('NFKC').trim();
    if (normalized.length === 0 || normalized.length > 500) {
      throw new InvalidSaleCancelReasonError();
    }
    return new SaleCancelReason(normalized);
  }
}
