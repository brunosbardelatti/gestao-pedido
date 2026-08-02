import type { CatalogOption } from './catalog';
import { getProductCatalogReferences } from './catalog';
import { listProducts, type ProductDetails } from './products';

export interface OrderCatalog {
  brands: CatalogOption[];
  products: ProductDetails[];
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
