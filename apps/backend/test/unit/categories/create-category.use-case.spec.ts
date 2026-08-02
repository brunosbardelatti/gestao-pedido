import { describe, expect, it, vi } from 'vitest';

import type { CreateCategoryPersistence } from '../../../src/modules/categories/application/ports/create-category-persistence';
import { CreateCategoryUseCase } from '../../../src/modules/categories/application/use-cases/create-category.use-case';
import { CategoryAlreadyExistsError } from '../../../src/modules/categories/domain/errors/category-already-exists.error';
import { InvalidCategoryNameError } from '../../../src/modules/categories/domain/errors/invalid-category-name.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const createdAt = new Date('2026-08-02T12:00:00.000Z');

function makeSubject(
  createdCategory: Awaited<
    ReturnType<CreateCategoryPersistence['createWithAudit']>
  > = {
    id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
    name: 'Perfumaria',
    active: true,
    createdAt,
    updatedAt: createdAt,
  },
) {
  const persistence: CreateCategoryPersistence = {
    createWithAudit: vi.fn().mockResolvedValue(createdCategory),
  };
  const useCase = new CreateCategoryUseCase(persistence);

  return { useCase, persistence };
}

describe('CreateCategoryUseCase', () => {
  it('normalizes the name and creates an audited active category', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      name: '  Perfumaria  ',
      requestId: 'req-create-category',
    });

    expect(subject.persistence.createWithAudit).toHaveBeenCalledWith({
      actorId,
      name: 'Perfumaria',
      normalizedName: 'perfumaria',
      requestId: 'req-create-category',
    });
    expect(result).toEqual({
      id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      name: 'Perfumaria',
      active: true,
      createdAt,
      updatedAt: createdAt,
    });
  });

  it('rejects a duplicate name reported by persistence', async () => {
    const subject = makeSubject(null);

    await expect(
      subject.useCase.execute({ actorId, name: 'PERFUMARIA' }),
    ).rejects.toBeInstanceOf(CategoryAlreadyExistsError);
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejects the invalid name %j before persistence',
    async (name) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ actorId, name }),
      ).rejects.toBeInstanceOf(InvalidCategoryNameError);
      expect(subject.persistence.createWithAudit).not.toHaveBeenCalled();
    },
  );
});
