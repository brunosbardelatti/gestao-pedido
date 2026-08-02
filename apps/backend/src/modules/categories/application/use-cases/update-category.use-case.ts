import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists.error';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { CategoryName } from '../../domain/value-objects/category-name';
import type { PersistedCategory } from '../ports/create-category-persistence';
import type { UpdateCategoryPersistence } from '../ports/update-category-persistence';

export interface UpdateCategoryInput {
  actorId: string;
  categoryId: string;
  name: string;
  requestId?: string;
}

export type UpdateCategoryOutput = PersistedCategory;

export class UpdateCategoryUseCase {
  constructor(private readonly persistence: UpdateCategoryPersistence) {}

  async execute(input: UpdateCategoryInput): Promise<UpdateCategoryOutput> {
    const name = CategoryName.create(input.name);
    const result = await this.persistence.updateWithAudit({
      actorId: input.actorId,
      categoryId: input.categoryId,
      name: name.value,
      normalizedName: name.normalizedValue,
      requestId: input.requestId,
    });

    if (result.status === 'not_found') {
      throw new CategoryNotFoundError();
    }

    if (result.status === 'conflict') {
      throw new CategoryAlreadyExistsError();
    }

    return result.category;
  }
}
