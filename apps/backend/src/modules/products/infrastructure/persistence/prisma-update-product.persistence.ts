import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  UpdateProductPersistence,
  UpdateProductPersistenceInput,
  UpdateProductPersistenceResult,
} from '../../application/ports/update-product-persistence';

@Injectable()
export class PrismaUpdateProductPersistence
  implements UpdateProductPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateWithAudit(
    input: UpdateProductPersistenceInput,
  ): Promise<UpdateProductPersistenceResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const currentProduct = await transaction.product.findUnique({
          where: { id: input.productId },
          select: { id: true },
        });
        if (!currentProduct) return { status: 'not_found' };

        const brand = await transaction.brand.findUnique({
          where: { id: input.brandId },
          select: { id: true },
        });
        if (!brand) return { status: 'brand_not_found' };

        const category = await transaction.category.findUnique({
          where: { id: input.categoryId },
          select: { id: true },
        });
        if (!category) return { status: 'category_not_found' };

        const product = await transaction.product.update({
          where: { id: input.productId },
          data: {
            brandId: input.brandId,
            categoryId: input.categoryId,
            code: input.code,
            normalizedCode: input.normalizedCode,
            description: input.description,
            catalogPrice: input.catalogPrice,
            purchasePrice: input.purchasePrice,
            originalPrice: input.originalPrice,
            suggestedSalePrice: input.suggestedSalePrice,
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
            action: 'PRODUCT_UPDATED',
            entityType: 'Product',
            entityId: product.id,
            requestId: input.requestId,
          },
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
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'conflict' };
      }

      throw error;
    }
  }
}
