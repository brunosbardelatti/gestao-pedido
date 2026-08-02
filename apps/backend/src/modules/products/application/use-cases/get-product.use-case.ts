import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import type { PersistedProduct } from '../ports/create-product-persistence';
import type { GetProductPersistence } from '../ports/get-product-persistence';

export class GetProductUseCase {
  constructor(private readonly persistence: GetProductPersistence) {}

  async execute(productId: string): Promise<PersistedProduct> {
    const product = await this.persistence.findById(productId);

    if (!product) throw new ProductNotFoundError();

    return product;
  }
}
