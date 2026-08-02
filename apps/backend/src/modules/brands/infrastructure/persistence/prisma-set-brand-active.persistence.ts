import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  SetBrandActivePersistence,
  SetBrandActivePersistenceInput,
  SetBrandActivePersistenceResult,
} from '../../application/ports/set-brand-active-persistence';

@Injectable()
export class PrismaSetBrandActivePersistence
  implements SetBrandActivePersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async setActiveWithAudit(
    input: SetBrandActivePersistenceInput,
  ): Promise<SetBrandActivePersistenceResult> {
    try {
      const brand = await this.prisma.$transaction(async (transaction) => {
        const updatedBrand = await transaction.brand.update({
          where: { id: input.brandId },
          data: {
            active: input.active,
            updatedById: input.actorId,
          },
          select: {
            id: true,
            name: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await transaction.auditLog.create({
          data: {
            actorType: ActorType.USER,
            userId: input.actorId,
            action: input.active ? 'BRAND_ACTIVATED' : 'BRAND_DEACTIVATED',
            entityType: 'Brand',
            entityId: updatedBrand.id,
            requestId: input.requestId,
          },
        });

        return updatedBrand;
      });

      return { status: 'updated', brand };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return { status: 'not_found' };
      }

      throw error;
    }
  }
}
