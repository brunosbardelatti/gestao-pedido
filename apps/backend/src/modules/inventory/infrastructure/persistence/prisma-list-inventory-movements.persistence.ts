import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListInventoryMovementsPersistence,
  ListInventoryMovementsPersistenceInput,
  ListInventoryMovementsPersistenceResult,
} from '../../application/ports/list-inventory-movements-persistence';

@Injectable()
export class PrismaListInventoryMovementsPersistence
  implements ListInventoryMovementsPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListInventoryMovementsPersistenceInput,
  ): Promise<ListInventoryMovementsPersistenceResult> {
    const endExclusive = input.endDate
      ? new Date(`${input.endDate}T00:00:00.000Z`)
      : undefined;
    endExclusive?.setUTCDate(endExclusive.getUTCDate() + 1);
    const where: Prisma.InventoryMovementWhereInput = {
      productId: input.productId,
      type: input.type,
      ...(input.startDate || endExclusive
        ? {
            createdAt: {
              ...(input.startDate
                ? { gte: new Date(`${input.startDate}T00:00:00.000Z`) }
                : {}),
              ...(endExclusive ? { lt: endExclusive } : {}),
            },
          }
        : {}),
    };
    const [movements, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          productId: true,
          type: true,
          quantityDelta: true,
          reason: true,
          orderItemId: true,
          saleItemId: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              login: true,
              role: true,
              active: true,
            },
          },
          createdAt: true,
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      items: movements.map((movement) => ({
        ...movement,
        createdAt: movement.createdAt.toISOString(),
      })),
      total,
    };
  }
}
