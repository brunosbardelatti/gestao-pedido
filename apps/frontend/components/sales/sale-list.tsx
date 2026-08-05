import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  SaleDetails,
  SaleListMeta,
  SaleListQuery,
  SaleStatus,
} from '@/lib/sales';
import { cn } from '@/lib/utils';
import { CancelSaleSection } from './cancel-sale-section';
import { DownloadSaleReceiptButton } from './download-sale-receipt-button';

interface SaleListProps {
  sales: SaleDetails[];
  meta: SaleListMeta;
  query: SaleListQuery;
}

const statusPresentation: Record<
  SaleStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  COMPLETED: {
    label: 'Concluída',
    icon: CheckCircle2,
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  CANCELED: {
    label: 'Cancelada',
    icon: Ban,
    className: 'text-muted-foreground',
  },
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function quantitySummary(sale: SaleDetails): string {
  const products = sale.items.length;
  const units = sale.items.reduce((total, item) => total + item.quantity, 0);
  return `${products} ${products === 1 ? 'produto' : 'produtos'} / ${units} ${units === 1 ? 'unidade' : 'unidades'}`;
}

function pageHref(query: SaleListQuery, page: number): string {
  const searchParams = new URLSearchParams();
  if (query.status) searchParams.set('status', query.status);
  if (query.customerId) searchParams.set('customerId', query.customerId);
  if (query.startDate) searchParams.set('startDate', query.startDate);
  if (query.endDate) searchParams.set('endDate', query.endDate);
  searchParams.set('page', String(page));
  return `/sales?${searchParams.toString()}`;
}

export function SaleList({ sales, meta, query }: SaleListProps): React.JSX.Element {
  if (sales.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <ReceiptText className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">Nenhuma venda encontrada.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros para ampliar a consulta.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(10rem,1.3fr)_minmax(8rem,1fr)_minmax(8rem,0.9fr)_minmax(8rem,0.8fr)_minmax(8rem,1fr)_2rem] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>Cliente</span>
          <span>Data</span>
          <span>Situação</span>
          <span>Total</span>
          <span>Itens</span>
          <span className="sr-only">Detalhes</span>
        </div>
        <div className="divide-y divide-border">
          {sales.map((sale) => {
            const presentation = statusPresentation[sale.status];
            const StatusIcon = presentation.icon;
            return (
              <details key={sale.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(10rem,1.3fr)_minmax(8rem,1fr)_minmax(8rem,0.9fr)_minmax(8rem,0.8fr)_minmax(8rem,1fr)_2rem] md:items-center md:gap-4">
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <p className="break-words text-sm font-semibold">
                      {sale.customer?.name ?? 'Sem cliente'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground md:hidden">
                      {formatDate(sale.saleDate)}
                    </p>
                  </div>
                  <p className="hidden text-sm md:block">{formatDate(sale.saleDate)}</p>
                  <div className="text-sm">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                      Situação
                    </p>
                    <span className={cn('inline-flex items-center gap-1.5', presentation.className)}>
                      <StatusIcon className="size-4" aria-hidden />
                      {presentation.label}
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">Total</p>
                    {currency.format(Number(sale.total))}
                  </div>
                  <div className="col-span-2 text-sm md:col-span-1">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">Itens</p>
                    {quantitySummary(sale)}
                  </div>
                  <ChevronDown
                    className="col-span-2 size-4 justify-self-end text-muted-foreground transition-transform group-open:rotate-180 md:col-span-1"
                    aria-hidden
                  />
                </summary>
                <div className="border-t border-border bg-muted/30 px-4 py-5 sm:px-5">
                  <div className="divide-y divide-border border-y border-border">
                    {sale.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem] sm:items-center"
                      >
                        <p className="break-words font-medium">
                          {item.productCode} - {item.productDescription}
                        </p>
                        <p>{item.quantity} un.</p>
                        <p>{currency.format(Number(item.unitPrice))}</p>
                        <p className="font-semibold sm:text-right">
                          {currency.format(Number(item.subtotal))}
                        </p>
                      </div>
                    ))}
                  </div>
                  <DownloadSaleReceiptButton saleId={sale.id} />
                  {sale.status === 'COMPLETED' ? (
                    <CancelSaleSection saleId={sale.id} total={sale.total} />
                  ) : (
                    <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                      Motivo: {sale.cancelReason ?? 'Não informado'}
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Página {meta.page} de {Math.max(meta.totalPages, 1)}
          <span className="hidden sm:inline">
            {' '}· {meta.total} {meta.total === 1 ? 'venda' : 'vendas'}
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
