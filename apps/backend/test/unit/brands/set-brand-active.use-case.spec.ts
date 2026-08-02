import { describe, expect, it, vi } from 'vitest';

import type {
  SetBrandActivePersistence,
  SetBrandActivePersistenceResult,
} from '../../../src/modules/brands/application/ports/set-brand-active-persistence';
import { SetBrandActiveUseCase } from '../../../src/modules/brands/application/use-cases/set-brand-active.use-case';
import { BrandNotFoundError } from '../../../src/modules/brands/domain/errors/brand-not-found.error';

const actorId = '55c1e5bb-4795-485b-af90-a8d25d3d94b1';
const brandId = '26bf7359-befe-4eb9-bcc9-58fc72489be0';

function makeSubject(
  result: SetBrandActivePersistenceResult = {
    status: 'updated',
    brand: {
      id: brandId,
      name: 'Natura',
      active: false,
      createdAt: new Date('2026-08-02T12:00:00.000Z'),
      updatedAt: new Date('2026-08-02T16:00:00.000Z'),
    },
  },
) {
  const persistence: SetBrandActivePersistence = {
    setActiveWithAudit: vi.fn().mockResolvedValue(result),
  };
  const useCase = new SetBrandActiveUseCase(persistence);

  return { useCase, persistence };
}

describe('SetBrandActiveUseCase', () => {
  it('deactivates the brand with audit context', async () => {
    const subject = makeSubject();

    const result = await subject.useCase.execute({
      actorId,
      brandId,
      active: false,
      requestId: 'req-deactivate-brand',
    });

    expect(subject.persistence.setActiveWithAudit).toHaveBeenCalledWith({
      actorId,
      brandId,
      active: false,
      requestId: 'req-deactivate-brand',
    });
    expect(result).toMatchObject({ id: brandId, active: false });
  });

  it('supports reactivation defined by the HTTP contract', async () => {
    const subject = makeSubject({
      status: 'updated',
      brand: {
        id: brandId,
        name: 'Natura',
        active: true,
        createdAt: new Date('2026-08-02T12:00:00.000Z'),
        updatedAt: new Date('2026-08-02T17:00:00.000Z'),
      },
    });

    const result = await subject.useCase.execute({
      actorId,
      brandId,
      active: true,
    });

    expect(subject.persistence.setActiveWithAudit).toHaveBeenCalledWith({
      actorId,
      brandId,
      active: true,
      requestId: undefined,
    });
    expect(result.active).toBe(true);
  });

  it('returns not found when the brand does not exist', async () => {
    const subject = makeSubject({ status: 'not_found' });

    await expect(
      subject.useCase.execute({ actorId, brandId, active: false }),
    ).rejects.toBeInstanceOf(BrandNotFoundError);
  });
});
