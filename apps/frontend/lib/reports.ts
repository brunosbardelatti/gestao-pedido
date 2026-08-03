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

interface InventoryReportResponse {
  data: InventoryReportItem[];
  meta: ReportPaginationMeta;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
