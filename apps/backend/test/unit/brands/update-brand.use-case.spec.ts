import { describe, expect, it, vi } from 'vitest';

import type {
  UpdateBrandPersistence,
  UpdateBrandPersistenceResult,
} from '../../../src/modules/brands/application/ports/update-brand-persistence';
import { UpdateBrandUseCase } from '../../../src/modules/brands/application/use-cases/update-brand.use-case';
import { BrandAlreadyExistsError } from '../../../src/modules/brands/domain/errors/brand-already-exists.error';
import { BrandNotFoundError } from '../../../src/modules/brands/domain/errors/brand-not-found.error';
import { InvalidBrandNameError } from '../../../src/modules/brands/domain/errors/invalid-brand-name.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';
const updatedAt = new Date('2026-08-02T15:00:00.000Z');

function makeSubject(
  result: UpdateBrandPersistenceResult = {
    status: 'updated',
    brand: {
      id: brandId,
      name: 'Natura Brasil',
      active: true,
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
      updatedAt,
    },
  },
) {
  const persistence: UpdateBrandPersistence = {
    updateWithAudit: vi.fn().mockResolvedValue(result),
  };
  const useCase = new UpdateBrandUseCase(persistence);

  return { useCase, persistence };
}

describe('UpdateBrandUseCase', () => {
  it('normalizes the name and updates the brand with audit context', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      brandId,
      name: '  Natura Brasil  ',
      requestId: 'req-update-brand',
    });

    expect(subject.persistence.updateWithAudit).toHaveBeenCalledWith({
      actorId,
      brandId,
      name: 'Natura Brasil',
      normalizedName: 'natura brasil',
      requestId: 'req-update-brand',
    });
    expect(result).toMatchObject({
      id: brandId,
      name: 'Natura Brasil',
      active: true,
      updatedAt,
    });
  });

  it('returns not found when the brand does not exist', async () => {
    const subject = makeSubject({ status: 'not_found' });

    await expect(
      subject.useCase.execute({ actorId, brandId, name: 'Natura Brasil' }),
    ).rejects.toBeInstanceOf(BrandNotFoundError);
  });

  it('rejects a name already used by another brand', async () => {
    const subject = makeSubject({ status: 'conflict' });

    await expect(
      subject.useCase.execute({ actorId, brandId, name: 'Avon' }),
    ).rejects.toBeInstanceOf(BrandAlreadyExistsError);
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejects the invalid name %j before persistence',
    async (name) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ actorId, brandId, name }),
      ).rejects.toBeInstanceOf(InvalidBrandNameError);
      expect(subject.persistence.updateWithAudit).not.toHaveBeenCalled();
    },
  );
});
