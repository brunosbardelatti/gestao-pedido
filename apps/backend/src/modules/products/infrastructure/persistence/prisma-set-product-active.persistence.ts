import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  SetProductActivePersistence,
  SetProductActivePersistenceInput,
  SetProductActivePersistenceResult,
} from '../../application/ports/set-product-active-persistence';

@Injectable()
export class PrismaSetProductActivePersistence
  implements SetProductActivePersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async setActiveWithAudit(
    input: SetProductActivePersistenceInput,
  ): Promise<SetProductActivePersistenceResult> {
    try {
      const product = await this.prisma.$transaction(async (transaction) => {
        const updatedProduct = await transaction.product.update({
          where: { id: input.productId },
          data: {
            active: input.active,
            updatedById: input.actorId,
          },
          select: {
            id: true,
            brand: {
              select: {
                id: true,
                name: true,
                active: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                active: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            code: true,
            description: true,
            catalogPrice: true,
            purchasePrice: true,
            originalPrice: true,
            suggestedSalePrice: true,
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
              ? 'PRODUCT_ACTIVATED'
              : 'PRODUCT_DEACTIVATED',
            entityType: 'Product',
            entityId: updatedProduct.id,
            requestId: input.requestId,
          },
        });

        return updatedProduct;
      });

      return {
        status: 'updated',
        product: {
          ...product,
          catalogPrice: product.catalogPrice.toFixed(2),
          purchasePrice: product.purchasePrice.toFixed(2),
          originalPrice: product.originalPrice.toFixed(2),
          suggestedSalePrice: product.suggestedSalePrice?.toFixed(2) ?? null,
        },
      };
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
