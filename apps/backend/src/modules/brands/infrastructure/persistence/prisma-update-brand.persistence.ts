import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  UpdateBrandPersistence,
  UpdateBrandPersistenceInput,
  UpdateBrandPersistenceResult,
} from '../../application/ports/update-brand-persistence';

@Injectable()
export class PrismaUpdateBrandPersistence implements UpdateBrandPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateWithAudit(
    input: UpdateBrandPersistenceInput,
  ): Promise<UpdateBrandPersistenceResult> {
    try {
      const brand = await this.prisma.$transaction(async (transaction) => {
        const updatedBrand = await transaction.brand.update({
          where: { id: input.brandId },
          data: {
            name: input.name,
            normalizedName: input.normalizedName,
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
            action: 'BRAND_UPDATED',
            entityType: 'Brand',
            entityId: updatedBrand.id,
            requestId: input.requestId,
          },
        });

        return updatedBrand;
      });

      return { status: 'updated', brand };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { status: 'not_found' };
        }

        if (error.code === 'P2002') {
          return { status: 'conflict' };
        }
      }

      throw error;
    }
  }
}
