import { AlertCircle, ArrowLeft, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { OrderList } from '@/components/orders/order-list';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getCurrentUser } from '@/lib/auth';
import { getProductCatalogReferences } from '@/lib/catalog';
import {
  listOrders,
  type OrderListQuery,
  type OrderListResult,
  type OrderStatus,
} from '@/lib/orders';

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseStatus(value: string | undefined): OrderStatus | undefined {
  return value === 'OPEN' || value === 'RECEIVED' || value === 'CANCELED'
    ? value
    : undefined;
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): OrderListQuery {
  const rawPage = Number(stringParam(params.page));

  return {
    status: parseStatus(stringParam(params.status)),
    brandId: stringParam(params.brandId) || undefined,
    cycle: stringParam(params.cycle)?.trim() || undefined,
    startDate: stringParam(params.startDate) || undefined,
    endDate: stringParam(params.endDate) || undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: OrderListResult = {
  orders: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function OrdersPage({
  searchParams,
}: OrdersPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const [result, references] = await Promise.all([
    listOrders(query),
    getProductCatalogReferences({ activeOnly: false }),
  ]);
  const list = result ?? {
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
            <p className="section-kicker">Compras</p>
            <h1 className="mt-2 text-2xl font-semibold">Pedidos</h1>
          </div>
          <Link href="/orders/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden />
            Criar pedido
          </Link>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[0.9fr_1fr_1fr_0.9fr_0.9fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="order-status-filter">Situação</Label>
            <NativeSelect
              id="order-status-filter"
              name="status"
              defaultValue={query.status ?? ''}
            >
              <option value="">Todas</option>
              <option value="OPEN">Em aberto</option>
              <option value="RECEIVED">Recebidos</option>
              <option value="CANCELED">Cancelados</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-brand-filter">Marca</Label>
            <NativeSelect
              id="order-brand-filter"
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
            <Label htmlFor="order-cycle-filter">Ciclo</Label>
            <Input
              id="order-cycle-filter"
              name="cycle"
              defaultValue={query.cycle}
              maxLength={80}
              placeholder="Ex.: Ciclo 10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-start-date-filter">Data inicial</Label>
            <Input
              id="order-start-date-filter"
              name="startDate"
              type="date"
              defaultValue={query.startDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-end-date-filter">Data final</Label>
            <Input
              id="order-end-date-filter"
              name="endDate"
              type="date"
              defaultValue={query.endDate}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Filtrar
            </Button>
            <Link
              href="/orders"
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
            <span>Não foi possível carregar os pedidos.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <OrderList orders={list.orders} meta={list.meta} query={query} />
        </div>
      </section>
    </main>
  );
}
