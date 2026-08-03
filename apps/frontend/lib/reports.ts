import { cookies } from 'next/headers';

export type InventoryReportSort =
  | 'description'
  | 'brandName'
  | 'balance'
  | 'suggestedSalePrice';
export type ReportSortOrder = 'asc' | 'desc';

export interface InventoryReportItem {
  productId: string;
  productCode: string;
  description: string;
  brandName: string;
  balance: number;
  suggestedSalePrice?: string;
}

export interface InventoryReportQuery {
  search?: string;
  sortBy?: InventoryReportSort;
  sortOrder?: ReportSortOrder;
  page?: number;
  pageSize?: number;
}

export interface ReportPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InventoryReportResult {
  items: InventoryReportItem[];
  meta: ReportPaginationMeta;
}

export interface SalesReportQuery {
  startDate: string;
  endDate: string;
  includeCanceled?: boolean;
}

export interface SalesReport {
  startDate: string;
  endDate: string;
  salesCount: number;
  itemsCount: number;
  revenue: string;
}

export interface MarginReportQuery {
  startDate: string;
  endDate: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}

export interface MarginReportItem {
  productId: string;
  productCode: string;
  description: string;
  quantitySold: number;
  revenue: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
}

export interface MarginReportResult {
  items: MarginReportItem[];
  meta: ReportPaginationMeta;
}

interface InventoryReportResponse {
  data: InventoryReportItem[];
  meta: ReportPaginationMeta;
}

interface SalesReportResponse {
  data: SalesReport;
}

interface MarginReportResponse {
  data: MarginReportItem[];
  meta: ReportPaginationMeta;
}

export interface ExpirationReportQuery {
  fromDate?: string;
  toDate?: string;
  withinDays?: number;
  page?: number;
  pageSize?: number;
}

export interface ExpirationReportItem {
  orderItemId: string;
  productId: string;
  productCode: string;
  description: string;
  expirationDate: string;
  quantityReceived: number;
  daysUntilExpiration: number;
  note: string;
}

export interface ExpirationReportResult {
  items: ExpirationReportItem[];
  meta: ReportPaginationMeta;
}

interface ExpirationReportResponse {
  data: ExpirationReportItem[];
  meta: ReportPaginationMeta;
}

const apiUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getInventoryReport(
  query: InventoryReportQuery,
): Promise<InventoryReportResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();
  if (query.search) searchParams.set('search', query.search);
  if (query.sortBy) searchParams.set('sortBy', query.sortBy);
  if (query.sortOrder) searchParams.set('sortOrder', query.sortOrder);
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/reports/inventory?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as InventoryReportResponse;
    return { items: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

export async function getSalesReport(
  query: SalesReportQuery,
): Promise<SalesReport | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams({
    startDate: query.startDate,
    endDate: query.endDate,
  });
  if (query.includeCanceled) searchParams.set('includeCanceled', 'true');

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/reports/sales?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as SalesReportResponse;
    return body.data;
  } catch {
    return null;
  }
}

export async function getExpirationReport(
  query: ExpirationReportQuery,
): Promise<ExpirationReportResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();
  if (query.fromDate) searchParams.set('fromDate', query.fromDate);
  if (query.toDate) searchParams.set('toDate', query.toDate);
  if (query.withinDays !== undefined)
    searchParams.set('withinDays', String(query.withinDays));
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/reports/expirations?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as ExpirationReportResponse;
    return { items: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

export async function getMarginReport(
  query: MarginReportQuery,
): Promise<MarginReportResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams({
    startDate: query.startDate,
    endDate: query.endDate,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
  });
  if (query.productId) searchParams.set('productId', query.productId);

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/reports/margins?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as MarginReportResponse;
    return { items: body.data, meta: body.meta };
  } catch {
    return null;
  }
}

