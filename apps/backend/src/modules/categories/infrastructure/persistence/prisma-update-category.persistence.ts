import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  UpdateCategoryPersistence,
  UpdateCategoryPersistenceInput,
  UpdateCategoryPersistenceResult,
} from '../../application/ports/update-category-persistence';

@Injectable()
export class PrismaUpdateCategoryPersistence
  implements UpdateCategoryPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateWithAudit(
    input: UpdateCategoryPersistenceInput,
  ): Promise<UpdateCategoryPersistenceResult> {
    try {
      const category = await this.prisma.$transaction(async (transaction) => {
        const updatedCategory = await transaction.category.update({
          where: { id: input.categoryId },
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
            action: 'CATEGORY_UPDATED',
            entityType: 'Category',
            entityId: updatedCategory.id,
            requestId: input.requestId,
          },
        });

        return updatedCategory;
      });

      return { status: 'updated', category };
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
