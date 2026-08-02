import { BrandAlreadyExistsError } from '../../domain/errors/brand-already-exists.error';
import { BrandNotFoundError } from '../../domain/errors/brand-not-found.error';
import { BrandName } from '../../domain/value-objects/brand-name';
import type { PersistedBrand } from '../ports/create-brand-persistence';
import type { UpdateBrandPersistence } from '../ports/update-brand-persistence';

export interface UpdateBrandInput {
  actorId: string;
  brandId: string;
  name: string;
  requestId?: string;
}

export type UpdateBrandOutput = PersistedBrand;

export class UpdateBrandUseCase {
  constructor(private readonly persistence: UpdateBrandPersistence) {}

  async execute(input: UpdateBrandInput): Promise<UpdateBrandOutput> {
    const name = BrandName.create(input.name);
    const result = await this.persistence.updateWithAudit({
      actorId: input.actorId,
      brandId: input.brandId,
      name: name.value,
      normalizedName: name.normalizedValue,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') {
      throw new BrandNotFoundError();
    }

    if (result.status === 'conflict') {
      throw new BrandAlreadyExistsError();
    }

    return result.brand;
  }
}
