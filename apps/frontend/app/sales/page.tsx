import { AlertCircle, ArrowLeft, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { SaleList } from '@/components/sales/sale-list';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getCurrentUser } from '@/lib/auth';
import {
  getSaleCustomerReferences,
  listSales,
  type SaleListQuery,
  type SaleListResult,
  type SaleStatus,
} from '@/lib/sales';

interface SalesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseStatus(value: string | undefined): SaleStatus | undefined {
  return value === 'COMPLETED' || value === 'CANCELED' ? value : undefined;
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): SaleListQuery {
  const rawPage = Number(stringParam(params.page));
  return {
    status: parseStatus(stringParam(params.status)),
    customerId: stringParam(params.customerId) || undefined,
    startDate: stringParam(params.startDate) || undefined,
    endDate: stringParam(params.endDate) || undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: SaleListResult = {
  sales: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function SalesPage({
  searchParams,
}: SalesPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const [result, customers] = await Promise.all([
    listSales(query),
    getSaleCustomerReferences(),
  ]);
  const list = result ?? {
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

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Vendas</p>
            <h1 className="mt-2 text-2xl font-semibold">Histórico de vendas</h1>
          </div>
          <Link href="/sales/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden />
            Registrar venda
          </Link>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1.25fr_0.9fr_0.9fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="sale-status-filter">Situação</Label>
            <NativeSelect id="sale-status-filter" name="status" defaultValue={query.status ?? ''}>
              <option value="">Todas</option>
              <option value="COMPLETED">Concluídas</option>
              <option value="CANCELED">Canceladas</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-customer-filter">Cliente</Label>
            <NativeSelect
              id="sale-customer-filter"
              name="customerId"
              defaultValue={query.customerId ?? ''}
            >
              <option value="">Todos</option>
              {(customers ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-start-date-filter">Data inicial</Label>
            <Input id="sale-start-date-filter" name="startDate" type="date" defaultValue={query.startDate} />
            <p className="text-xs text-muted-foreground mt-1">DD/MM/AAAA</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-end-date-filter">Data final</Label>
            <Input id="sale-end-date-filter" name="endDate" type="date" defaultValue={query.endDate} />
            <p className="text-xs text-muted-foreground mt-1">DD/MM/AAAA</p>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Filtrar
            </Button>
            <Link
              href="/sales"
              aria-label="Limpar filtros"
              title="Limpar filtros"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <X className="size-4" aria-hidden />
            </Link>
          </div>
        </form>

        {!result ? (
          <div role="alert" className="mt-6 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Não foi possível carregar as vendas.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <SaleList sales={list.sales} meta={list.meta} query={query} />
        </div>
      </section>
    </main>
  );
}
