import type { RejectImportedOrderPersistence } from '../ports/reject-imported-order-persistence';

export interface RejectImportedOrderInput {
  importedOrderId: string;
  userId: string;
  reason: string;
  requestId: string;
}

export class RejectImportedOrderUseCase {
  constructor(
    private readonly persistence: RejectImportedOrderPersistence,
  ) {}

  async execute(input: RejectImportedOrderInput): Promise<void> {
    await this.persistence.reject({
      importedOrderId: input.importedOrderId,
      userId: input.userId,
      reason: input.reason,
      requestId: input.requestId,
    });
  }
}
