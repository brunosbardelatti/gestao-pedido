import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListOrdersPersistence,
  ListOrdersPersistenceInput,
  ListOrdersPersistenceResult,
} from '../../application/ports/list-orders-persistence';
import { orderRelations, serializeOrder } from './order-persistence.mapper';

@Injectable()
export class PrismaListOrdersPersistence implements ListOrdersPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    input: ListOrdersPersistenceInput,
  ): Promise<ListOrdersPersistenceResult> {
    const where: Prisma.OrderWhereInput = {
      status: input.status,
      brandId: input.brandId,
      ...(input.cycle
        ? {
            cycle: {
              equals: input.cycle,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(input.startDate || input.endDate
        ? {
            orderDate: {
              ...(input.startDate
                ? { gte: new Date(`${input.startDate}T00:00:00.000Z`) }
                : {}),
              ...(input.endDate
                ? { lte: new Date(`${input.endDate}T00:00:00.000Z`) }
                : {}),
            },
          }
        : {}),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: orderRelations,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map(serializeOrder),
      total,
    };
  }
}
