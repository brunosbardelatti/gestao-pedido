import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  ListSalesPersistence,
  ListSalesPersistenceInput,
  ListSalesPersistenceResult,
} from '../../application/ports/list-sales-persistence';
import { saleRelations, serializeSale } from './sale-persistence.mapper';

function nextUtcDay(date: string): Date {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
}

@Injectable()
export class PrismaListSalesPersistence implements ListSalesPersistence {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(input: ListSalesPersistenceInput): Promise<ListSalesPersistenceResult> {
    const where: Prisma.SaleWhereInput = {
      status: input.status,
      customerId: input.customerId,
      ...(input.startDate || input.endDate
        ? {
            saleDate: {
              ...(input.startDate
                ? { gte: new Date(`${input.startDate}T00:00:00.000Z`) }
                : {}),
              ...(input.endDate ? { lt: nextUtcDay(input.endDate) } : {}),
            },
          }
        : {}),
    };
    const [sales, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: saleRelations,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { items: sales.map(serializeSale), total };
  }
}
