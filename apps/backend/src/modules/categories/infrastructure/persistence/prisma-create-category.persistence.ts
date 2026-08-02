import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateCategoryPersistence,
  CreateCategoryPersistenceInput,
  PersistedCategory,
} from '../../application/ports/create-category-persistence';

@Injectable()
export class PrismaCreateCategoryPersistence
  implements CreateCategoryPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createWithAudit(
    input: CreateCategoryPersistenceInput,
  ): Promise<PersistedCategory | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const category = await transaction.category.create({
          data: {
            name: input.name,
            normalizedName: input.normalizedName,
            createdById: input.actorId,
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
            action: 'CATEGORY_CREATED',
            entityType: 'Category',
            entityId: category.id,
            requestId: input.requestId,
          },
        });

        return category;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }

      throw error;
    }
  }
}
