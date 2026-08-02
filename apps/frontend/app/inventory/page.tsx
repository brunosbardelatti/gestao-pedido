import { AlertCircle, ArrowLeft, History, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StockList } from '@/components/inventory/stock-list';
import { AppHeader } from '@/components/layout/app-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getCurrentUser } from '@/lib/auth';
import { getProductCatalogReferences } from '@/lib/catalog';
import {
  getCurrentStock,
  type InventoryQuery,
  type InventoryResult,
} from '@/lib/inventory';

interface InventoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): InventoryQuery {
  const rawPage = Number(stringParam(params.page));

  return {
    search: stringParam(params.search)?.trim() || undefined,
    brandId: stringParam(params.brandId) || undefined,
    categoryId: stringParam(params.categoryId) || undefined,
    negativeOnly: stringParam(params.negativeOnly) === 'true',
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: InventoryResult = {
  balances: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const [result, references] = await Promise.all([
    getCurrentStock(query),
    getProductCatalogReferences({ activeOnly: false }),
  ]);
  const inventory = result ?? {
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
            <p className="section-kicker">Estoque</p>
            <h1 className="mt-2 text-2xl font-semibold">Saldos atuais</h1>
          </div>
          <Link
            href="/inventory/movements"
            className={buttonVariants({ variant: 'ghost' })}
          >
            <History className="size-4" aria-hidden />
            Ver movimentações
          </Link>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_auto_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="inventory-search">Código ou descrição</Label>
            <Input
              id="inventory-search"
              name="search"
              defaultValue={query.search}
              maxLength={120}
              placeholder="Buscar produto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventory-brand-filter">Marca</Label>
            <NativeSelect
              id="inventory-brand-filter"
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
            <Label htmlFor="inventory-category-filter">Categoria</Label>
            <NativeSelect
              id="inventory-category-filter"
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
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-medium">
            <input
              type="checkbox"
              name="negativeOnly"
              value="true"
              defaultChecked={query.negativeOnly}
              className="size-4 accent-[var(--ring)]"
            />
            Somente negativos
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Filtrar
            </Button>
            <Link
              href="/inventory"
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
            <span>Não foi possível carregar os saldos.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <StockList
            balances={inventory.balances}
            meta={inventory.meta}
            query={query}
          />
        </div>
      </section>
    </main>
  );
}
