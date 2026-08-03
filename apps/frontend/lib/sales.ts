import { cookies } from 'next/headers';

import type { CustomerDetails } from './customers';
import { listCustomers } from './customers';
import { getCurrentStock } from './inventory';
import { listProducts } from './products';

export interface SaleProductReference {
  id: string;
  code: string;
  description: string;
  suggestedSalePrice: string;
  balance: number;
}

export interface SaleCustomerReference {
  id: string;
  name: string;
}

export interface SaleCatalog {
  products: SaleProductReference[];
  customers: SaleCustomerReference[];
}

export type SaleStatus = 'COMPLETED' | 'CANCELED';

export interface SaleDetails {
  id: string;
  customer: CustomerDetails | null;
  status: SaleStatus;
  saleDate: string;
  paymentMethod:
    | 'CASH'
    | 'PIX'
    | 'DEBIT_CARD'
    | 'CREDIT_CARD'
    | 'BANK_TRANSFER'
    | 'OTHER'
    | null;
  total: string;
  notes: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  items: Array<{
    id: string;
    productId: string;
    productCode: string;
    productDescription: string;
    quantity: number;
    unitPrice: string;
    unitCostSnapshot: string;
    subtotal: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SaleListQuery {
  status?: SaleStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface SaleListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SaleListResult {
  sales: SaleDetails[];
  meta: SaleListMeta;
}

interface SaleListResponse {
  data: SaleDetails[];
  meta: SaleListMeta;
}

const apiUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function listSales(
  query: SaleListQuery,
): Promise<SaleListResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();
  if (query.status) searchParams.set('status', query.status);
  if (query.customerId) searchParams.set('customerId', query.customerId);
  if (query.startDate) searchParams.set('startDate', query.startDate);
  if (query.endDate) searchParams.set('endDate', query.endDate);
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/sales?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as SaleListResponse;
    return { sales: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

export async function getSaleCustomerReferences(): Promise<
  SaleCustomerReference[] | null
> {
  const first = await listCustomers({ page: 1, pageSize: 100 });
  if (!first) return null;
  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      listCustomers({ page: index + 2, pageSize: 100 }),
    ),
  );
  if (remaining.some((page) => !page)) return null;
  return [
    ...first.customers,
    ...remaining.flatMap((page) => page?.customers ?? []),
  ].map((customer) => ({ id: customer.id, name: customer.name }));
}

export async function getSaleCatalog(): Promise<SaleCatalog | null> {
  const [firstProducts, firstStock, firstCustomers] = await Promise.all([
    listProducts({ active: true, page: 1, pageSize: 100 }),
    getCurrentStock({ page: 1, pageSize: 100 }),
    listCustomers({ page: 1, pageSize: 100 }),
  ]);
  if (!firstProducts || !firstStock || !firstCustomers) return null;

  const [productPages, stockPages, customerPages] = await Promise.all([
    Promise.all(
      Array.from({ length: firstProducts.meta.totalPages - 1 }, (_, index) =>
        listProducts({ active: true, page: index + 2, pageSize: 100 }),
      ),
    ),
    Promise.all(
      Array.from({ length: firstStock.meta.totalPages - 1 }, (_, index) =>
        getCurrentStock({ page: index + 2, pageSize: 100 }),
      ),
    ),
    Promise.all(
      Array.from({ length: firstCustomers.meta.totalPages - 1 }, (_, index) =>
        listCustomers({ page: index + 2, pageSize: 100 }),
      ),
    ),
  ]);
  if (
    productPages.some((page) => !page) ||
    stockPages.some((page) => !page) ||
    customerPages.some((page) => !page)
  ) {
    return null;
  }

  const balances = new Map(
    [
      ...firstStock.balances,
      ...stockPages.flatMap((page) => page?.balances ?? []),
    ].map((balance) => [balance.productId, balance.balance]),
  );
  const products = [
    ...firstProducts.products,
    ...productPages.flatMap((page) => page?.products ?? []),
  ];
  const customers: CustomerDetails[] = [
    ...firstCustomers.customers,
    ...customerPages.flatMap((page) => page?.customers ?? []),
  ];

  return {
    products: products.map((product) => ({
      id: product.id,
      code: product.code,
      description: product.description,
      suggestedSalePrice:
        product.suggestedSalePrice ?? product.catalogPrice,
      balance: balances.get(product.id) ?? 0,
    })),
    customers: customers
      .filter((customer) => customer.active)
      .map((customer) => ({ id: customer.id, name: customer.name })),
  };
}

