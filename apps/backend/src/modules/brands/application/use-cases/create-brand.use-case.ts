import { BrandAlreadyExistsError } from '../../domain/errors/brand-already-exists.error';
import { BrandName } from '../../domain/value-objects/brand-name';
import type {
  CreateBrandPersistence,
  PersistedBrand,
} from '../ports/create-brand-persistence';

export interface CreateBrandInput {
  actorId: string;
  name: string;
  requestId?: string;
}

export type CreateBrandOutput = PersistedBrand;

export class CreateBrandUseCase {
  constructor(private readonly persistence: CreateBrandPersistence) {}

  async execute(input: CreateBrandInput): Promise<CreateBrandOutput> {
    const name = BrandName.create(input.name);
    const brand = await this.persistence.createWithAudit({
      actorId: input.actorId,
      name: name.value,
      normalizedName: name.normalizedValue,
      requestId: input.requestId,
    });

    if (!brand) {
      throw new BrandAlreadyExistsError();
    }

    return brand;
  }
}
