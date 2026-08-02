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
}

interface ProductResponse {
  data: ProductDetails;
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
