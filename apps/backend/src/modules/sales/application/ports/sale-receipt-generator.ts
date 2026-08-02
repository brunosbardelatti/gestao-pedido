import type { PersistedSale } from './create-sale-persistence';

export interface SaleReceiptGenerator {
  generate(sale: PersistedSale): Promise<Buffer>;
}
