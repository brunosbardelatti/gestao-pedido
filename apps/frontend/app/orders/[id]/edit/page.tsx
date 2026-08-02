import { ArrowLeft, LockKeyhole, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import {
  type HistoricalOrderProduct,
} from '@/components/orders/create-order-form';
import { UpdateOrderForm } from '@/components/orders/update-order-form';
import { buttonVariants } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import type { CatalogOption } from '@/lib/catalog';
import { getOrder, getOrderCatalog, type OrderDetails } from '@/lib/orders';
import type { ProductDetails } from '@/lib/products';

interface EditOrderPageProps {
  params: Promise<{ id: string }>;
}

function includeCurrentBrand(
  brands: CatalogOption[],
  brand: OrderDetails['brand'],
): CatalogOption[] {
  if (brands.some((option) => option.id === brand.id)) return brands;

  return [
    {
      id: brand.id,
      name: brand.active ? brand.name : `${brand.name} (inativa)`,
      active: brand.active,
    },
    ...brands,
  ];
}

function includeCurrentProducts(
  products: ProductDetails[],
  order: OrderDetails,
): Array<ProductDetails | HistoricalOrderProduct> {
  const result: Array<ProductDetails | HistoricalOrderProduct> = [...products];

  order.items.forEach((item) => {
    if (result.some((product) => product.id === item.productId)) return;

    result.unshift({
      id: item.productId,
      brandId: order.brand.id,
      code: item.productCode,
      description: `${item.productDescription} (indisponível)`,
      catalogPrice: item.catalogUnitPrice,
      purchasePrice: item.purchaseUnitPrice,
      originalPrice: item.originalUnitPrice,
    });
  });

  return result;
}

export default async function EditOrderPage({
  params,
}: EditOrderPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [order, catalog] = await Promise.all([getOrder(id), getOrderCatalog()]);
  if (!order) notFound();

  const brands = includeCurrentBrand(catalog?.brands ?? [], order.brand);
  const products = includeCurrentProducts(catalog?.products ?? [], order);

  return (
    <main className="min-h-svh bg-background text-foreground">
      <AppHeader user={user} />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para operação
        </Link>
        <div className="mt-8">
          <p className="section-kicker">Pedidos</p>
          <h1 className="mt-2 text-2xl font-semibold">Editar pedido</h1>
          {order.status === 'OPEN' ? (
            <>
              <UpdateOrderForm
                orderId={order.id}
                brands={brands}
                products={products}
                initialValues={{
                  brandId: order.brand.id,
                  cycle: order.cycle,
                  orderDate: order.orderDate,
                  notes: order.notes ?? '',
                  items: order.items.map((item) => ({
                    productId: item.productId,
                    quantityOrdered: item.quantityOrdered,
                    catalogUnitPrice: item.catalogUnitPrice,
                    purchaseUnitPrice: item.purchaseUnitPrice,
                    originalUnitPrice: item.originalUnitPrice,
                    notes: item.notes ?? '',
                  })),
                }}
                referenceError={
                  catalog ? undefined : 'Não foi possível carregar o catálogo.'
                }
              />
              <div className="mt-8 max-w-5xl border-t border-border pt-6">
                <Link
                  href={`/orders/${order.id}/receive`}
                  className={buttonVariants()}
                >
                  <PackageCheck className="size-4" aria-hidden />
                  Receber pedido
                </Link>
              </div>
            </>
          ) : (
            <div
              role="status"
              className="mt-8 flex max-w-3xl items-start gap-3 border-y border-border py-5 text-sm"
            >
              <LockKeyhole
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <p className="font-semibold">Pedido não editável</p>
                <p className="mt-1 text-muted-foreground">
                  {order.status === 'RECEIVED'
                    ? 'Este pedido já foi recebido.'
                    : 'Este pedido foi cancelado.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
