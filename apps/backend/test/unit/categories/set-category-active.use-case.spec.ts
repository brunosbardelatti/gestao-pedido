import { describe, expect, it, vi } from 'vitest';

import type {
  SetCategoryActivePersistence,
  SetCategoryActivePersistenceResult,
} from '../../../src/modules/categories/application/ports/set-category-active-persistence';
import { SetCategoryActiveUseCase } from '../../../src/modules/categories/application/use-cases/set-category-active.use-case';
import { CategoryNotFoundError } from '../../../src/modules/categories/domain/errors/category-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const categoryId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';

function makeSubject(
  result: SetCategoryActivePersistenceResult = {
    status: 'updated',
    category: {
      id: categoryId,
      name: 'Perfumaria',
      active: false,
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
      updatedAt: new Date('2026-08-02T16:00:00.000Z'),
    },
  },
) {
  const persistence: SetCategoryActivePersistence = {
    setActiveWithAudit: vi.fn().mockResolvedValue(result),
  };
  const useCase = new SetCategoryActiveUseCase(persistence);

  return { useCase, persistence };
}

describe('SetCategoryActiveUseCase', () => {
  it('deactivates the category with audit context', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      categoryId,
      active: false,
      requestId: 'req-deactivate-category',
    });

    expect(subject.persistence.setActiveWithAudit).toHaveBeenCalledWith({
      actorId,
      categoryId,
      active: false,
      requestId: 'req-deactivate-category',
    });
    expect(result).toMatchObject({ id: categoryId, active: false });
  });

  it('supports reactivation defined by the HTTP contract', async () => {
    const subject = makeSubject({
      status: 'updated',
      category: {
        id: categoryId,
        name: 'Perfumaria',
        active: true,
        createdAt: new Date('2026-08-02T12:00:00.000Z'),
        updatedAt: new Date('2026-08-02T17:00:00.000Z'),
      },
    });

    const result = await subject.useCase.execute({
      actorId,
      categoryId,
      active: true,
    });

    expect(subject.persistence.setActiveWithAudit).toHaveBeenCalledWith({
      actorId,
      categoryId,
      active: true,
      requestId: undefined,
    });
    expect(result.active).toBe(true);
  });

  it('returns not found when the category does not exist', async () => {
    const subject = makeSubject({ status: 'not_found' });

    await expect(
      subject.useCase.execute({ actorId, categoryId, active: false }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
