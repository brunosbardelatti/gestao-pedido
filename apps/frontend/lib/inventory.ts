import { cookies } from 'next/headers';

import { listProducts } from './products';

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

export type InventoryMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_CANCELLATION'
  | 'CORRECTION'
  | 'PERSONAL_USE'
  | 'RETURN';

export interface InventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantityDelta: number;
  reason: string | null;
  orderItemId: string | null;
  saleItemId: string | null;
  createdBy: {
    id: string;
    name: string;
    login: string;
    role: 'ADMIN' | 'OPERATOR';
    active: boolean;
  };
  createdAt: string;
}

export interface InventoryMovementQuery {
  productId?: string;
  type?: InventoryMovementType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface InventoryMovementResult {
  movements: InventoryMovement[];
  meta: InventoryMeta;
}

export interface InventoryProductReference {
  id: string;
  code: string;
  description: string;
}

export interface InventoryAdjustmentProduct extends InventoryProductReference {
  balance: number;
}

interface InventoryResponse {
  data: InventoryBalance[];
  meta: InventoryMeta;
}

interface InventoryMovementResponse {
  data: InventoryMovement[];
  meta: InventoryMeta;
}

const apiUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

export async function listInventoryMovements(
  query: InventoryMovementQuery,
): Promise<InventoryMovementResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();

  if (query.productId) searchParams.set('productId', query.productId);
  if (query.type) searchParams.set('type', query.type);
  if (query.startDate) searchParams.set('startDate', query.startDate);
  if (query.endDate) searchParams.set('endDate', query.endDate);
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/inventory/movements?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as InventoryMovementResponse;
    return { movements: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

export async function getInventoryProducts(): Promise<
  InventoryProductReference[] | null
> {
  const firstPage = await listProducts({ page: 1, pageSize: 100 });
  if (!firstPage) return null;

  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.totalPages - 1) },
      (_, index) => listProducts({ page: index + 2, pageSize: 100 }),
    ),
  );
  if (remainingPages.some((page) => !page)) return null;

  return [
    ...firstPage.products,
    ...remainingPages.flatMap((page) => page?.products ?? []),
  ].map((product) => ({
    id: product.id,
    code: product.code,
    description: product.description,
  }));
}

export async function getInventoryAdjustmentProducts(): Promise<
  InventoryAdjustmentProduct[] | null
> {
  const [products, firstPage] = await Promise.all([
    getInventoryProducts(),
    getCurrentStock({ page: 1, pageSize: 100 }),
  ]);
  if (!products || !firstPage) return null;

  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.totalPages - 1) },
      (_, index) => getCurrentStock({ page: index + 2, pageSize: 100 }),
    ),
  );
  if (remainingPages.some((page) => !page)) return null;

  const balances = new Map(
    [
      ...firstPage.balances,
      ...remainingPages.flatMap((page) => page?.balances ?? []),
    ].map((item) => [item.productId, item.balance]),
  );

  return products.map((product) => ({
    ...product,
    balance: balances.get(product.id) ?? 0,
  }));
}
