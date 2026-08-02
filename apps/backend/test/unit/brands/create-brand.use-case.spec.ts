import { describe, expect, it, vi } from 'vitest';

import type { CreateBrandPersistence } from '../../../src/modules/brands/application/ports/create-brand-persistence';
import { CreateBrandUseCase } from '../../../src/modules/brands/application/use-cases/create-brand.use-case';
import { BrandAlreadyExistsError } from '../../../src/modules/brands/domain/errors/brand-already-exists.error';
import { InvalidBrandNameError } from '../../../src/modules/brands/domain/errors/invalid-brand-name.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const createdAt = new Date('2026-08-02T12:00:00.000Z');

function makeSubject(createdBrand: Awaited<ReturnType<CreateBrandPersistence['createWithAudit']>> = {
  id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
  name: 'Natura',
  active: true,
  createdAt,
  updatedAt: createdAt,
}) {
  const persistence: CreateBrandPersistence = {
    createWithAudit: vi.fn().mockResolvedValue(createdBrand),
  };
  const useCase = new CreateBrandUseCase(persistence);

  return { useCase, persistence };
}

describe('CreateBrandUseCase', () => {
  it('normalizes the name and creates an audited active brand', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      name: '  Natura  ',
      requestId: 'req-create-brand',
    });

    expect(subject.persistence.createWithAudit).toHaveBeenCalledWith({
      actorId,
      name: 'Natura',
      normalizedName: 'natura',
      requestId: 'req-create-brand',
    });
    expect(result).toEqual({
      id: '26bf7359-befe-4eb9-bcc9-58fc72489be0',
      name: 'Natura',
      active: true,
      createdAt,
      updatedAt: createdAt,
    });
  });

  it('rejects a duplicate name reported by persistence', async () => {
    const subject = makeSubject(null);

    await expect(
      subject.useCase.execute({ actorId, name: 'NATURA' }),
    ).rejects.toBeInstanceOf(BrandAlreadyExistsError);
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejects the invalid name %j before persistence',
    async (name) => {
      const subject = makeSubject();

      await expect(
        subject.useCase.execute({ actorId, name }),
      ).rejects.toBeInstanceOf(InvalidBrandNameError);
      expect(subject.persistence.createWithAudit).not.toHaveBeenCalled();
    },
  );
});
