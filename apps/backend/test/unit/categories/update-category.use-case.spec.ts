import { describe, expect, it, vi } from 'vitest';

import type {
  UpdateCategoryPersistence,
  UpdateCategoryPersistenceResult,
} from '../../../src/modules/categories/application/ports/update-category-persistence';
import { UpdateCategoryUseCase } from '../../../src/modules/categories/application/use-cases/update-category.use-case';
import { CategoryAlreadyExistsError } from '../../../src/modules/categories/domain/errors/category-already-exists.error';
import { CategoryNotFoundError } from '../../../src/modules/categories/domain/errors/category-not-found.error';
import { InvalidCategoryNameError } from '../../../src/modules/categories/domain/errors/invalid-category-name.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const categoryId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const updatedAt = new Date('2026-08-02T15:00:00.000Z');

function makeSubject(
  result: UpdateCategoryPersistenceResult = {
    status: 'updated',
    category: {
      id: categoryId,
      name: 'Perfumaria Feminina',
      active: true,
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
      updatedAt,
    },
  },
) {
  const persistence: UpdateCategoryPersistence = {
    updateWithAudit: vi.fn().mockResolvedValue(result),
  };
  const useCase = new UpdateCategoryUseCase(persistence);

  return { useCase, persistence };
}

describe('UpdateCategoryUseCase', () => {
  it('normalizes the name and updates the category with audit context', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      categoryId,
      name: '  Perfumaria Feminina  ',
      requestId: 'req-update-category',
    });

    expect(subject.persistence.updateWithAudit).toHaveBeenCalledWith({
      actorId,
      categoryId,
      name: 'Perfumaria Feminina',
      normalizedName: 'perfumaria feminina',
      requestId: 'req-update-category',
    });
    expect(result).toMatchObject({
      id: categoryId,
      name: 'Perfumaria Feminina',
      active: true,
      updatedAt,
    });
  });

  it('returns not found when the category does not exist', async () => {
    const subject = makeSubject({ status: 'not_found' });

    await expect(
      subject.useCase.execute({
        actorId,
        categoryId,
        name: 'Perfumaria Feminina',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });

  it('rejects a name already used by another category', async () => {
    const subject = makeSubject({ status: 'conflict' });

    await expect(
      subject.useCase.execute({ actorId, categoryId, name: 'Maquiagem' }),
    ).rejects.toBeInstanceOf(CategoryAlreadyExistsError);
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejects the invalid name %j before persistence',
    async (name) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ actorId, categoryId, name }),
      ).rejects.toBeInstanceOf(InvalidCategoryNameError);
      expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
    },
  );
});
