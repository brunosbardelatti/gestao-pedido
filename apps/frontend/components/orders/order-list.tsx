import {
  Ban,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Eye,
  PackageCheck,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  OrderDetails,
  OrderListMeta,
  OrderListQuery,
  OrderStatus,
} from '@/lib/orders';
import { cn } from '@/lib/utils';

interface OrderListProps {
  orders: OrderDetails[];
  meta: OrderListMeta;
  query: OrderListQuery;
}

const statusPresentation: Record<
  OrderStatus,
  { label: string; icon: typeof CircleDot; className: string }
> = {
  OPEN: {
    label: 'Em aberto',
    icon: CircleDot,
    className: 'text-amber-700 dark:text-amber-400',
  },
  RECEIVED: {
    label: 'Recebido',
    icon: PackageCheck,
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  CANCELED: {
    label: 'Cancelado',
    icon: Ban,
    className: 'text-muted-foreground',
  },
};

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function quantitySummary(order: OrderDetails): string {
  const productCount = order.items.length;
  const unitCount = order.items.reduce(
    (total, item) => total + item.quantityOrdered,
    0,
  );

  return `${productCount} ${productCount === 1 ? 'produto' : 'produtos'} / ${unitCount} ${unitCount === 1 ? 'unidade' : 'unidades'}`;
}

function pageHref(query: OrderListQuery, page: number): string {
  const searchParams = new URLSearchParams();

  if (query.status) searchParams.set('status', query.status);
  if (query.brandId) searchParams.set('brandId', query.brandId);
  if (query.cycle) searchParams.set('cycle', query.cycle);
  if (query.startDate) searchParams.set('startDate', query.startDate);
  if (query.endDate) searchParams.set('endDate', query.endDate);
  searchParams.set('page', String(page));

  return `/orders?${searchParams.toString()}`;
}

export function OrderList({
  orders,
  meta,
  query,
}: OrderListProps): React.JSX.Element {
  if (orders.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <ClipboardList
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm font-semibold">Nenhum pedido encontrado.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros para ampliar a consulta.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(8rem,1.2fr)_minmax(8rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,1fr)_minmax(9rem,1.1fr)_2.5rem] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>Ciclo</span>
          <span>Marca</span>
          <span>Data</span>
          <span>Situação</span>
          <span>Itens</span>
          <span className="sr-only">Ações</span>
        </div>
        <div className="divide-y divide-border">
          {orders.map((order) => {
            const presentation = statusPresentation[order.status];
            const StatusIcon = presentation.icon;

            return (
              <div
                key={order.id}
                className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 md:grid-cols-[minmax(8rem,1.2fr)_minmax(8rem,1fr)_minmax(7rem,0.8fr)_minmax(8rem,1fr)_minmax(9rem,1.1fr)_2.5rem] md:items-center md:gap-4"
              >
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <p className="break-words text-sm font-semibold">{order.cycle}</p>
                  <p className="mt-1 text-xs text-muted-foreground md:hidden">
                    {order.brand.name}
                  </p>
                </div>
                <div className="hidden min-w-0 text-sm md:block">
                  <p className="break-words">{order.brand.name}</p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                    Data
                  </p>
                  <p>{formatDate(order.orderDate)}</p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                    Situação
                  </p>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      presentation.className,
                    )}
                  >
                    <StatusIcon className="size-4" aria-hidden />
                    {presentation.label}
                  </span>
                </div>
                <div className="col-span-2 text-sm md:col-span-1">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                    Itens
                  </p>
                  <p>{quantitySummary(order)}</p>
                </div>
                <div className="col-span-2 flex justify-end md:col-span-1">
                  <Link
                    href={`/orders/${order.id}/edit`}
                    aria-label={`Abrir pedido ${order.cycle}`}
                    title={`Abrir ${order.cycle}`}
                    className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                  >
                    <Eye className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Página {meta.page} de {Math.max(meta.totalPages, 1)}
          <span className="hidden sm:inline">
            {' '}· {meta.total} {meta.total === 1 ? 'pedido' : 'pedidos'}
          </span>
        </p>
        <div className="flex gap-1">
          {meta.page > 1 ? (
            <Link
              href={pageHref(query, meta.page - 1)}
              aria-label="Página anterior"
              title="Página anterior"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Página anterior"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'opacity-40 cursor-not-allowed',
              )}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          )}
          {meta.page < meta.totalPages ? (
            <Link
              href={pageHref(query, meta.page + 1)}
              aria-label="Próxima página"
              title="Próxima página"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Próxima página"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'opacity-40 cursor-not-allowed',
              )}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
