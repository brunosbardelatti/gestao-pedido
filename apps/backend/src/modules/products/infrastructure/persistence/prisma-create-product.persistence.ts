import { Inject, Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  CreateProductPersistence,
  CreateProductPersistenceInput,
  CreateProductPersistenceResult,
} from '../../application/ports/create-product-persistence';

@Injectable()
export class PrismaCreateProductPersistence
  implements CreateProductPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createWithAudit(
    input: CreateProductPersistenceInput,
  ): Promise<CreateProductPersistenceResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const brand = await transaction.brand.findUnique({
          where: { id: input.brandId },
          select: { active: true },
        });

        if (!brand) {
          return { status: 'brand_not_found' };
        }

        if (!brand.active) {
          return { status: 'brand_inactive' };
        }

        const category = await transaction.category.findUnique({
          where: { id: input.categoryId },
          select: { active: true },
        });

        if (!category) {
          return { status: 'category_not_found' };
        }

        if (!category.active) {
          return { status: 'category_inactive' };
        }

        const product = await transaction.product.create({
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
            createdById: input.actorId,
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
            action: 'PRODUCT_CREATED',
            entityType: 'Product',
            entityId: product.id,
            requestId: input.requestId,
          },
        });

        return {
          status: 'created',
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
        return { status: 'duplicate' };
      }

      throw error;
    }
  }
}
