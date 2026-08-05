import { AlertCircle, ArrowLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { InventoryReportTable } from '@/components/reports/inventory-report-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getCurrentUser } from '@/lib/auth';
import {
  getInventoryReport,
  type InventoryReportQuery,
  type InventoryReportResult,
  type InventoryReportSort,
  type ReportSortOrder,
} from '@/lib/reports';

interface InventoryReportPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseSort(value: string | undefined): InventoryReportSort {
  return value === 'brandName' ||
    value === 'balance' ||
    value === 'suggestedSalePrice'
    ? value
    : 'description';
}

function parseSortOrder(value: string | undefined): ReportSortOrder {
  return value === 'desc' ? 'desc' : 'asc';
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): InventoryReportQuery {
  const rawPage = Number(stringParam(params.page));
  return {
    search: stringParam(params.search)?.trim() || undefined,
    sortBy: parseSort(stringParam(params.sortBy)),
    sortOrder: parseSortOrder(stringParam(params.sortOrder)),
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: InventoryReportResult = {
  items: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function InventoryReportPage({
  searchParams,
}: InventoryReportPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const result = await getInventoryReport(query);
  const report = result ?? {
    ...emptyResult,
    meta: { ...emptyResult.meta, page: query.page ?? 1 },
  };

  return (
    <main className="min-h-screen min-h-svh bg-background text-foreground">
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
          <p className="section-kicker">Relatórios</p>
          <h1 className="mt-2 text-2xl font-semibold">Posição de estoque</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Saldo atual calculado a partir de todas as movimentações registradas.
          </p>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.5fr)_1fr_0.8fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="inventory-report-search">Produto ou marca</Label>
            <Input
              id="inventory-report-search"
              name="search"
              defaultValue={query.search}
              maxLength={120}
              placeholder="Buscar no relatório"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventory-report-sort">Ordenar por</Label>
            <NativeSelect
              id="inventory-report-sort"
              name="sortBy"
              defaultValue={query.sortBy}
            >
              <option value="description">Produto</option>
              <option value="brandName">Marca</option>
              <option value="balance">Saldo</option>
              <option value="suggestedSalePrice">Preço sugerido</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inventory-report-order">Direção</Label>
            <NativeSelect
              id="inventory-report-order"
              name="sortOrder"
              defaultValue={query.sortOrder}
            >
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </NativeSelect>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Aplicar
            </Button>
            <Link
              href="/reports/inventory"
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
            <span>Não foi possível carregar o relatório de estoque.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <InventoryReportTable items={report.items} meta={report.meta} query={query} />
        </div>
      </section>
    </main>
  );
}
