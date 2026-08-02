import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import type { PersistedCategory } from '../ports/create-category-persistence';
import type { SetCategoryActivePersistence } from '../ports/set-category-active-persistence';

export interface SetCategoryActiveInput {
  actorId: string;
  categoryId: string;
  active: boolean;
  requestId?: string;
}

export type SetCategoryActiveOutput = PersistedCategory;

export class SetCategoryActiveUseCase {
  constructor(private readonly persistence: SetCategoryActivePersistence) {}

  async execute(
    input: SetCategoryActiveInput,
  ): Promise<SetCategoryActiveOutput> {
    const result = await this.persistence.setActiveWithAudit(input);

    if (result.status === 'not_found') {
      throw new CategoryNotFoundError();
    }

    return result.category;
  }
}
