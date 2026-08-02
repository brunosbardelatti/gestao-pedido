import { cookies } from 'next/headers';

interface ProductReference {
  id: string;
  name: string;
  active: boolean;
}

export interface ProductDetails {
  id: string;
  brand: ProductReference;
  category: ProductReference;
  code: string;
  description: string;
  catalogPrice: string;
  purchasePrice: string;
  originalPrice: string;
  suggestedSalePrice: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductResponse {
  data: ProductDetails;
}

export interface ProductListQuery {
  search?: string;
  brandId?: string;
  categoryId?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductListResult {
  products: ProductDetails[];
  meta: ProductListMeta;
}

interface ProductListResponse {
  data: ProductDetails[];
  meta: ProductListMeta;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getProduct(productId: string): Promise<ProductDetails | null> {
  const cookieStore = await cookies();

  try {
    const response = await fetch(`${apiUrl}/api/v1/products/${productId}`, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return ((await response.json()) as ProductResponse).data;
  } catch {
    return null;
  }
}

export async function listProducts(
  query: ProductListQuery,
): Promise<ProductListResult | null> {
  const cookieStore = await cookies();
  const searchParams = new URLSearchParams();

  if (query.search) searchParams.set('search', query.search);
  if (query.brandId) searchParams.set('brandId', query.brandId);
  if (query.categoryId) searchParams.set('categoryId', query.categoryId);
  if (query.active !== undefined) {
    searchParams.set('active', String(query.active));
  }
  searchParams.set('page', String(query.page ?? 1));
  searchParams.set('pageSize', String(query.pageSize ?? 20));

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/products?${searchParams.toString()}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: 'no-store',
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as ProductListResponse;
    return { products: body.data, meta: body.meta };
  } catch {
    return null;
  }
}
