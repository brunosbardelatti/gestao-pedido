import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  GetMarginReportPersistence,
  GetMarginReportPersistenceInput,
  GetMarginReportPersistenceResult,
} from '../../application/ports/get-margin-report-persistence';

interface MarginReportRow {
  productId: string;
  productCode: string;
  description: string;
  quantitySold: bigint;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
}

interface ReportCountRow {
  total: bigint;
}

function nextUtcDay(date: string): Date {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value;
}

@Injectable()
export class PrismaGetMarginReportPersistence
  implements GetMarginReportPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getMargins(
    input: GetMarginReportPersistenceInput,
  ): Promise<GetMarginReportPersistenceResult> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`s.status = 'COMPLETED'::"SaleStatus"`,
      Prisma.sql`s.sale_date >= ${new Date(`${input.startDate}T00:00:00.000Z`)}`,
      Prisma.sql`s.sale_date < ${nextUtcDay(input.endDate)}`,
    ];
    if (input.productId) {
      conditions.push(Prisma.sql`si.product_id = ${input.productId}::uuid`);
    }
    const where = Prisma.join(conditions, ' AND ');
    const offset = (input.page - 1) * input.pageSize;
    const [rows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<MarginReportRow[]>(Prisma.sql`
        SELECT
          p.id AS "productId",
          p.code AS "productCode",
          p.description,
          SUM(si.quantity)::bigint AS "quantitySold",
          SUM(si.subtotal) AS revenue,
          SUM(si.quantity * si.unit_cost_snapshot) AS cost
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        INNER JOIN products p ON p.id = si.product_id
        WHERE ${where}
        GROUP BY p.id
        ORDER BY
          (SUM(si.subtotal) - SUM(si.quantity * si.unit_cost_snapshot)) DESC,
          p.description ASC, p.code ASC, p.id ASC
        LIMIT ${input.pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<ReportCountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT si.product_id)::bigint AS total
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        WHERE ${where}
      `),
    ]);

    return {
      items: rows.map((row) => ({
        productId: row.productId,
        productCode: row.productCode,
        description: row.description,
        quantitySold: Number(row.quantitySold),
        revenue: row.revenue.toFixed(2),
        cost: row.cost.toFixed(2),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
