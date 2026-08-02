import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import type {
  GetCurrentStockPersistence,
  GetCurrentStockPersistenceInput,
  GetCurrentStockPersistenceResult,
} from '../../application/ports/get-current-stock-persistence';

interface InventoryBalanceRow {
  productId: string;
  productCode: string;
  description: string;
  brandName: string;
  balance: bigint;
  suggestedSalePrice: Prisma.Decimal | null;
}

interface InventoryBalanceCountRow {
  total: bigint;
}

@Injectable()
export class PrismaGetCurrentStockPersistence
  implements GetCurrentStockPersistence
{
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listBalances(
    input: GetCurrentStockPersistenceInput,
  ): Promise<GetCurrentStockPersistenceResult> {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (input.search) {
      conditions.push(
        Prisma.sql`(p.code ILIKE ${`%${input.search}%`} OR p.description ILIKE ${`%${input.search}%`})`,
      );
    }
    if (input.brandId) {
      conditions.push(Prisma.sql`p.brand_id = ${input.brandId}::uuid`);
    }
    if (input.categoryId) {
      conditions.push(Prisma.sql`p.category_id = ${input.categoryId}::uuid`);
    }

    const where = Prisma.join(conditions, ' AND ');
    const having = input.negativeOnly
      ? Prisma.sql`HAVING COALESCE(SUM(im.quantity_delta), 0) < 0`
      : Prisma.empty;
    const offset = (input.page - 1) * input.pageSize;
    const [rows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<InventoryBalanceRow[]>(Prisma.sql`
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
        ${having}
        ORDER BY p.description ASC, p.code ASC, p.id ASC
        LIMIT ${input.pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<InventoryBalanceCountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM (
          SELECT p.id
          FROM products p
          LEFT JOIN inventory_movements im ON im.product_id = p.id
          WHERE ${where}
          GROUP BY p.id
          ${having}
        ) balances
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
