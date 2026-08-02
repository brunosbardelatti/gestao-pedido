import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type { PersistedProduct } from '../../application/ports/create-product-persistence';
import type { GetProductPersistence } from '../../application/ports/get-product-persistence';

@Injectable()
export class PrismaGetProductPersistence implements GetProductPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(productId: string): Promise<PersistedProduct | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
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

    return product
      ? {
          ...product,
          catalogPrice: product.catalogPrice.toFixed(2),
          purchasePrice: product.purchasePrice.toFixed(2),
          originalPrice: product.originalPrice.toFixed(2),
          suggestedSalePrice: product.suggestedSalePrice?.toFixed(2) ?? null,
        }
      : null;
  }
}
