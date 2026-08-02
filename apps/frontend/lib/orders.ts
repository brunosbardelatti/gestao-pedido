import { cookies } from 'next/headers';

import type { CatalogOption } from './catalog';
import { getProductCatalogReferences } from './catalog';
import { listProducts, type ProductDetails } from './products';

export interface OrderCatalog {
  brands: CatalogOption[];
  products: ProductDetails[];
}

export interface OrderDetails {
  id: string;
  brand: {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  cycle: string;
  orderDate: string;
  receivedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  status: 'OPEN' | 'RECEIVED' | 'CANCELED';
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productCode: string;
    productDescription: string;
    quantityOrdered: number;
    quantityReceived: number;
    catalogUnitPrice: string;
    purchaseUnitPrice: string;
    originalUnitPrice: string;
    expirationDate: string | null;
    notes: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface OrderResponse {
  data: OrderDetails;
}

export type OrderStatus = OrderDetails['status'];

export interface OrderListQuery {
  status?: OrderStatus;
  brandId?: string;
  cycle?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OrderListResult {
  orders: OrderDetails[];
  meta: OrderListMeta;
}

interface OrderListResponse {
  data: OrderDetails[];
  meta: OrderListMeta;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getOrder(orderId: string): Promise<OrderDetails | null> {
  const cookieStore = await cookies();

  try {
    const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}`, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });
    if (!response.ok) return null;

    return ((await response.json()) as OrderResponse).data;
  } catch {
    return null;
  }
}

export async function listOrders(
  query: OrderListQuery,
): Promise<OrderListResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();

  if (query.status) searchParams.set('status', query.status);
  if (query.brandId) searchParams.set('brandId', query.brandId);
  if (query.cycle) searchParams.set('cycle', query.cycle);
  if (query.startDate) searchParams.set('startDate', query.startDate);
  if (query.endDate) searchParams.set('endDate', query.endDate);
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/orders?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as OrderListResponse;
    return { orders: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

export async function getOrderCatalog(): Promise<OrderCatalog | null> {
  const [references, firstPage] = await Promise.all([
    getProductCatalogReferences(),
    listProducts({ active: true, page: 1, pageSize: 100 }),
  ]);
  if (!references || !firstPage) return null;

  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.totalPages - 1) },
      (_, index) =>
        listProducts({ active: true, page: index + 2, pageSize: 100 }),
    ),
  );
  if (remainingPages.some((page) => !page)) return null;

  return {
    brands: references.brands,
    products: [
      ...firstPage.products,
      ...remainingPages.flatMap((page) => page?.products ?? []),
    ],
  };
}
