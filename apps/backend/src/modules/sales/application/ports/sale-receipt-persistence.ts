import type { PersistedSale } from './create-sale-persistence';

export interface SaleReceiptPersistenceInput {
  actorId: string;
  saleId: string;
  requestId?: string;
}

export interface SaleReceiptPersistence {
  findForReceiptWithAudit(
    input: SaleReceiptPersistenceInput,
  ): Promise<PersistedSale | null>;
}
