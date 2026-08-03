import { Inject, Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  GetExpirationReportPersistence,
  GetExpirationReportPersistenceInput,
  GetExpirationReportPersistenceResult,
} from '../../application/ports/get-expiration-report-persistence';

@Injectable()
export class PrismaGetExpirationReportPersistence
  implements GetExpirationReportPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getExpirations(
    input: GetExpirationReportPersistenceInput,
  ): Promise<GetExpirationReportPersistenceResult> {
    const where = {
      order: { status: OrderStatus.RECEIVED },
      quantityReceived: { gt: 0 },
      expirationDate: {
        gte: new Date(`${input.fromDate}T00:00:00.000Z`),
        lte: new Date(`${input.toDate}T00:00:00.000Z`),
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.orderItem.findMany({
        where,
        include: { product: true },
        orderBy: [
          { expirationDate: 'asc' },
          { product: { description: 'asc' } },
          { id: 'asc' },
        ],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        productCode: item.product.code,
        description: item.product.description,
        expirationDate: item.expirationDate!.toISOString().slice(0, 10),
        quantityReceived: item.quantityReceived,
      })),
      total,
    };
  }
}
