import { cookies } from 'next/headers';

export interface InventoryBalance {
  productId: string;
  productCode: string;
  description: string;
  brandName: string;
  balance: number;
  suggestedSalePrice?: string;
}

export interface InventoryQuery {
  search?: string;
  brandId?: string;
  categoryId?: string;
  negativeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface InventoryMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InventoryResult {
  balances: InventoryBalance[];
  meta: InventoryMeta;
}

interface InventoryResponse {
  data: InventoryBalance[];
  meta: InventoryMeta;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getCurrentStock(
  query: InventoryQuery,
): Promise<InventoryResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();

  if (query.search) searchParams.set('search', query.search);
  if (query.brandId) searchParams.set('brandId', query.brandId);
  if (query.categoryId) searchParams.set('categoryId', query.categoryId);
  if (query.negativeOnly) searchParams.set('negativeOnly', 'true');
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/inventory?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as InventoryResponse;
    return { balances: body.data, meta: body.meta };
  } catch {
    return null;
  }
}
