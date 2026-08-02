import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateBrandPersistence,
  CreateBrandPersistenceInput,
  PersistedBrand,
} from '../../application/ports/create-brand-persistence';

@Injectable()
export class PrismaCreateBrandPersistence implements CreateBrandPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createWithAudit(
    input: CreateBrandPersistenceInput,
  ): Promise<PersistedBrand | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const brand = await transaction.brand.create({
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
            action: 'BRAND_CREATED',
            entityType: 'Brand',
            entityId: brand.id,
            requestId: input.requestId,
          },
        });

        return brand;
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
