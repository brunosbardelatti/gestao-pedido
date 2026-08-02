import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  SetCategoryActivePersistence,
  SetCategoryActivePersistenceInput,
  SetCategoryActivePersistenceResult,
} from '../../application/ports/set-category-active-persistence';

@Injectable()
export class PrismaSetCategoryActivePersistence
  implements SetCategoryActivePersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async setActiveWithAudit(
    input: SetCategoryActivePersistenceInput,
  ): Promise<SetCategoryActivePersistenceResult> {
    try {
      const category = await this.prisma.$transaction(async (transaction) => {
        const updatedCategory = await transaction.category.update({
          where: { id: input.categoryId },
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
            action: input.active
              ? 'CATEGORY_ACTIVATED'
              : 'CATEGORY_DEACTIVATED',
            entityType: 'Category',
            entityId: updatedCategory.id,
            requestId: input.requestId,
          },
        });

        return updatedCategory;
      });

      return { status: 'updated', category };
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
