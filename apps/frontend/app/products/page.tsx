import { AlertCircle, ArrowLeft, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { ProductList } from '@/components/products/product-list';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getCurrentUser } from '@/lib/auth';
import { getProductCatalogReferences } from '@/lib/catalog';
import {
  listProducts,
  type ProductListQuery,
  type ProductListResult,
} from '@/lib/products';

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): ProductListQuery {
  const rawPage = Number(stringParam(params.page));
  const active = stringParam(params.active);

  return {
    search: stringParam(params.search)?.trim() || undefined,
    brandId: stringParam(params.brandId) || undefined,
    categoryId: stringParam(params.categoryId) || undefined,
    active: active === 'true' ? true : active === 'false' ? false : undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: ProductListResult = {
  products: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const [result, references] = await Promise.all([
    listProducts(query),
    getProductCatalogReferences({ activeOnly: false }),
  ]);
  const catalog = result ?? {
    ...emptyResult,
    meta: { ...emptyResult.meta, page: query.page ?? 1 },
  };

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

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Catálogo</p>
            <h1 className="mt-2 text-2xl font-semibold">Produtos</h1>
          </div>
          <Link href="/products/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden />
            Cadastrar produto
          </Link>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_0.8fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="product-search">Código ou descrição</Label>
            <Input
              id="product-search"
              name="search"
              defaultValue={query.search}
              maxLength={120}
              placeholder="Buscar no catálogo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-brand-filter">Marca</Label>
            <NativeSelect
              id="product-brand-filter"
              name="brandId"
              defaultValue={query.brandId ?? ''}
            >
              <option value="">Todas</option>
              {(references?.brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}{brand.active === false ? ' (inativa)' : ''}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-category-filter">Categoria</Label>
            <NativeSelect
              id="product-category-filter"
              name="categoryId"
              defaultValue={query.categoryId ?? ''}
            >
              <option value="">Todas</option>
              {(references?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.active === false ? ' (inativa)' : ''}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-active-filter">Situação</Label>
            <NativeSelect
              id="product-active-filter"
              name="active"
              defaultValue={
                query.active === undefined ? '' : String(query.active)
              }
            >
              <option value="">Todas</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </NativeSelect>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Filtrar
            </Button>
            <Link
              href="/products"
              aria-label="Limpar filtros"
              title="Limpar filtros"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <X className="size-4" aria-hidden />
            </Link>
          </div>
        </form>

        {!result ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Não foi possível carregar os produtos.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <ProductList
            products={catalog.products}
            meta={catalog.meta}
            query={query}
          />
        </div>
      </section>
    </main>
  );
}
