import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import type { PersistedProduct } from '../ports/create-product-persistence';
import type { SetProductActivePersistence } from '../ports/set-product-active-persistence';

export interface SetProductActiveInput {
  actorId: string;
  productId: string;
  active: boolean;
  requestId?: string;
}

export type SetProductActiveOutput = PersistedProduct;

export class SetProductActiveUseCase {
  constructor(private readonly persistence: SetProductActivePersistence) {}

  async execute(input: SetProductActiveInput): Promise<SetProductActiveOutput> {
    const result = await this.persistence.setActiveWithAudit(input);

    if (result.status === 'not_found') throw new ProductNotFoundError();

    return result.product;
  }
}
