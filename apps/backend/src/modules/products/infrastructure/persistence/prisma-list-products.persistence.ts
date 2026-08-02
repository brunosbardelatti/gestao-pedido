import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListProductsPersistence,
  ListProductsPersistenceInput,
  ListProductsPersistenceResult,
} from '../../application/ports/list-products-persistence';

@Injectable()
export class PrismaListProductsPersistence implements ListProductsPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListProductsPersistenceInput,
  ): Promise<ListProductsPersistenceResult> {
    const where: Prisma.ProductWhereInput = {
      brandId: input.brandId,
      categoryId: input.categoryId,
      active: input.active,
      ...(input.search
        ? {
            OR: [
              {
                normalizedCode: {
                  contains: input.search.toLowerCase(),
                },
              },
              {
                description: {
                  contains: input.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ description: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
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
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products.map((product) => ({
        ...product,
        catalogPrice: product.catalogPrice.toFixed(2),
        purchasePrice: product.purchasePrice.toFixed(2),
        originalPrice: product.originalPrice.toFixed(2),
        suggestedSalePrice: product.suggestedSalePrice?.toFixed(2) ?? null,
      })),
      total,
    };
  }
}
