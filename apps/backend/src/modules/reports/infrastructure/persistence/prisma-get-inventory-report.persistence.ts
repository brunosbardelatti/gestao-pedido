import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  GetInventoryReportPersistence,
  GetInventoryReportPersistenceInput,
  GetInventoryReportPersistenceResult,
  InventoryReportSort,
} from '../../application/ports/get-inventory-report-persistence';

interface InventoryReportRow {
  productId: string;
  productCode: string;
  description: string;
  brandName: string;
  balance: bigint;
  suggestedSalePrice: Prisma.Decimal | null;
}

interface ReportCountRow {
  total: bigint;
}

const orderColumns: Record<InventoryReportSort, Prisma.Sql> = {
  description: Prisma.sql`p.description`,
  brandName: Prisma.sql`b.name`,
  balance: Prisma.sql`COALESCE(SUM(im.quantity_delta), 0)`,
  suggestedSalePrice: Prisma.sql`p.suggested_sale_price`,
};

@Injectable()
export class PrismaGetInventoryReportPersistence
  implements GetInventoryReportPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getInventory(
    input: GetInventoryReportPersistenceInput,
  ): Promise<GetInventoryReportPersistenceResult> {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (input.search) {
      conditions.push(
        Prisma.sql`(
          p.code ILIKE ${`%${input.search}%`}
          OR p.description ILIKE ${`%${input.search}%`}
          OR b.name ILIKE ${`%${input.search}%`}
        )`,
      );
    }

    const where = Prisma.join(conditions, ' AND ');
    const orderColumn = orderColumns[input.sortBy];
    const orderDirection =
      input.sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const offset = (input.page - 1) * input.pageSize;
    const [rows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<InventoryReportRow[]>(Prisma.sql`
        SELECT
          p.id AS "productId",
          p.code AS "productCode",
          p.description,
          b.name AS "brandName",
          COALESCE(SUM(im.quantity_delta), 0)::bigint AS balance,
          p.suggested_sale_price AS "suggestedSalePrice"
        FROM products p
        INNER JOIN brands b ON b.id = p.brand_id
        LEFT JOIN inventory_movements im ON im.product_id = p.id
        WHERE ${where}
        GROUP BY p.id, b.name
        ORDER BY ${orderColumn} ${orderDirection} NULLS LAST,
          p.description ASC, p.code ASC, p.id ASC
        LIMIT ${input.pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<ReportCountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM products p
        INNER JOIN brands b ON b.id = p.brand_id
        WHERE ${where}
      `),
    ]);

    return {
      items: rows.map((row) => ({
        productId: row.productId,
        productCode: row.productCode,
        description: row.description,
        brandName: row.brandName,
        balance: Number(row.balance),
        ...(row.suggestedSalePrice
          ? { suggestedSalePrice: row.suggestedSalePrice.toFixed(2) }
          : {}),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
