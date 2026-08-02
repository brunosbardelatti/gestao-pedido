import { BrandNotFoundError } from '../../domain/errors/brand-not-found.error';
import type { PersistedBrand } from '../ports/create-brand-persistence';
import type { SetBrandActivePersistence } from '../ports/set-brand-active-persistence';

export interface SetBrandActiveInput {
  actorId: string;
  brandId: string;
  active: boolean;
  requestId?: string;
}

export type SetBrandActiveOutput = PersistedBrand;

export class SetBrandActiveUseCase {
  constructor(private readonly persistence: SetBrandActivePersistence) {}

  async execute(input: SetBrandActiveInput): Promise<SetBrandActiveOutput> {
    const result = await this.persistence.setActiveWithAudit(input);

    if (result.status === 'not_found') {
      throw new BrandNotFoundError();
    }

    return result.brand;
  }
}
