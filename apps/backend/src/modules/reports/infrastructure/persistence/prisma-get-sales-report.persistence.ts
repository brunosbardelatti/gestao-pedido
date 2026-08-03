import { Inject, Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  GetSalesReportPersistence,
  GetSalesReportPersistenceInput,
  SalesReportTotals,
} from '../../application/ports/get-sales-report-persistence';

function nextUtcDay(date: string): Date {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
}

@Injectable()
export class PrismaGetSalesReportPersistence
  implements GetSalesReportPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSalesTotals(
    input: GetSalesReportPersistenceInput,
  ): Promise<SalesReportTotals> {
    const saleWhere: Prisma.SaleWhereInput = {
      saleDate: {
        gte: new Date(`${input.startDate}T00:00:00.000Z`),
        lt: nextUtcDay(input.endDate),
      },
      ...(input.includeCanceled ? {} : { status: SaleStatus.COMPLETED }),
    };
    const [sales, items] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.saleItem.aggregate({
        where: { sale: saleWhere },
        _sum: { quantity: true },
      }),
    ]);

    return {
      salesCount: sales._count._all,
      itemsCount: items._sum.quantity ?? 0,
      revenue: sales._sum.total?.toFixed(2) ?? '0.00',
    };
  }
}
