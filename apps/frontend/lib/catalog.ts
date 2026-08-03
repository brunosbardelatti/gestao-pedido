import { cookies } from 'next/headers';

export interface CatalogOption {
  id: string;
  name: string;
  active?: boolean;
}

export interface ProductCatalogReferences {
  brands: CatalogOption[];
  categories: CatalogOption[];
}

interface CatalogEntity extends CatalogOption {
  active: boolean;
}

interface CatalogListResponse {
  data: CatalogEntity[];
  meta: {
    totalPages: number;
  };
}

const apiUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchCatalogOptions(
  resource: 'brands' | 'categories',
  cookieHeader: string,
  activeOnly: boolean,
): Promise<CatalogOption[]> {
  async function fetchPage(page: number): Promise<CatalogListResponse> {
    const response = await fetch(
      `${apiUrl}/api/v1/${resource}?page=${page}&pageSize=100`,
      {
        headers: { Cookie: cookieHeader },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load ${resource}`);
    }

    return (await response.json()) as CatalogListResponse;
  }

  const firstPage = await fetchPage(1);
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.totalPages - 1) },
      (_, index) => fetchPage(index + 2),
    ),
  );

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.data)
    .filter((item) => !activeOnly || item.active)
    .map(({ id, name, active }) => ({ id, name, active }));
}

export async function getProductCatalogReferences(
  options: { activeOnly?: boolean } = {},
): Promise<ProductCatalogReferences | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const activeOnly = options.activeOnly ?? true;

  try {
    const [brands, categories] = await Promise.all([
      fetchCatalogOptions('brands', cookieHeader, activeOnly),
      fetchCatalogOptions('categories', cookieHeader, activeOnly),
    ]);

    return { brands, categories };
  } catch {
    return null;
  }
}
