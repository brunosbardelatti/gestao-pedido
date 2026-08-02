import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { UpdateProductForm } from '@/components/products/update-product-form';
import { getCurrentUser } from '@/lib/auth';
import {
  type CatalogOption,
  getProductCatalogReferences,
} from '@/lib/catalog';
import { getProduct, type ProductDetails } from '@/lib/products';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

function includeCurrentReference(
  options: CatalogOption[],
  reference: ProductDetails['brand'],
): CatalogOption[] {
  if (options.some((option) => option.id === reference.id)) return options;

  return [
    {
      id: reference.id,
      name: reference.active ? reference.name : `${reference.name} (inativa)`,
    },
    ...options,
  ];
}

export default async function EditProductPage({
  params,
}: EditProductPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  const { id } = await params;
  const [product, references] = await Promise.all([
    getProduct(id),
    getProductCatalogReferences(),
  ]);

  if (!product) notFound();

  const brands = includeCurrentReference(references?.brands ?? [], product.brand);
  const categories = includeCurrentReference(
    references?.categories ?? [],
    product.category,
  );

  return (
    <main className="min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/products/new"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para cadastro
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Catálogo</p>
          <h1 className="mt-2 text-2xl font-semibold">Editar produto</h1>
          <UpdateProductForm
            productId={product.id}
            brands={brands}
            categories={categories}
            initialValues={{
              brandId: product.brand.id,
              categoryId: product.category.id,
              code: product.code,
              description: product.description,
              catalogPrice: product.catalogPrice,
              purchasePrice: product.purchasePrice,
              originalPrice: product.originalPrice,
              suggestedSalePrice: product.suggestedSalePrice ?? '',
            }}
            referenceError={
              references
                ? undefined
                : 'Não foi possível carregar outras marcas e categorias.'
            }
          />
        </div>
      </section>
    </main>
  );
}
