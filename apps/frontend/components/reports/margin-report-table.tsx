import {
  AlertTriangle,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  MarginReportItem,
  MarginReportQuery,
  ReportPaginationMeta,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface MarginReportTableProps {
  items: MarginReportItem[];
  meta: ReportPaginationMeta;
  query: MarginReportQuery;
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const percentage = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function pageHref(query: MarginReportQuery, page: number): string {
  const searchParams = new URLSearchParams({
    startDate: query.startDate,
    endDate: query.endDate,
  });
  if (query.productId) searchParams.set('productId', query.productId);
  searchParams.set('page', String(page));
  return `/reports/margins?${searchParams.toString()}`;
}

export function MarginReportTable({
  items,
  meta,
  query,
}: MarginReportTableProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <ChartNoAxesCombined
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm font-semibold">
          Nenhuma margem encontrada no período.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste o período ou o produto selecionado.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(12rem,1.7fr)_4.5rem_7rem_7rem_7rem_6rem] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground lg:grid">
          <span>Produto</span>
          <span>Qtd.</span>
          <span>Receita</span>
          <span>Custo</span>
          <span>Margem</span>
          <span>Percentual</span>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => {
            const negative = Number(item.margin) < 0;
            return (
              <div
                key={item.productId}
                className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 sm:grid-cols-3 lg:grid-cols-[minmax(12rem,1.7fr)_4.5rem_7rem_7rem_7rem_6rem] lg:items-center lg:gap-4"
              >
                <div className="col-span-2 min-w-0 sm:col-span-3 lg:col-span-1">
                  <p className="break-words text-sm font-semibold">{item.productCode}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">Qtd.</p>
                  <p>{item.quantitySold}</p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">Receita</p>
                  <p>{currency.format(Number(item.revenue))}</p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">Custo</p>
                  <p>{currency.format(Number(item.cost))}</p>
                </div>
                <div className={cn('text-sm font-semibold', negative && 'text-destructive')}>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">Margem</p>
                  <p>{currency.format(Number(item.margin))}</p>
                  {negative ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      Margem negativa
                    </p>
                  ) : null}
                </div>
                <div className={cn('text-sm font-semibold', negative && 'text-destructive')}>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">Percentual</p>
                  <p>
                    {item.marginPercent === null
                      ? 'Não aplicável'
                      : `${percentage.format(item.marginPercent)}%`}
                  </p>
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
            {' '}· {meta.total} {meta.total === 1 ? 'produto' : 'produtos'}
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
            <span
              aria-hidden
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'pointer-events-none opacity-40',
              )}
            >
              <ChevronLeft className="size-4" />
            </span>
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
            <span
              aria-hidden
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'pointer-events-none opacity-40',
              )}
            >
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>
    </>
  );
}
