import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists.error';
import { CategoryName } from '../../domain/value-objects/category-name';
import type {
  CreateCategoryPersistence,
  PersistedCategory,
} from '../ports/create-category-persistence';

export interface CreateCategoryInput {
  actorId: string;
  name: string;
  requestId?: string;
}

export type CreateCategoryOutput = PersistedCategory;

export class CreateCategoryUseCase {
  constructor(private readonly persistence: CreateCategoryPersistence) {}

  async execute(input: CreateCategoryInput): Promise<CreateCategoryOutput> {
    const name = CategoryName.create(input.name);
    const category = await this.persistence.createWithAudit({
      actorId: input.actorId,
      name: name.value,
      normalizedName: name.normalizedValue,
      requestId: input.requestId,
    });

    if (!category) {
      throw new CategoryAlreadyExistsError();
    }

    return category;
  }
}
