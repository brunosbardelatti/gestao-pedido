import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  ExpirationReportItem,
  ExpirationReportQuery,
  ReportPaginationMeta,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface ExpirationReportTableProps {
  items: ExpirationReportItem[];
  meta: ReportPaginationMeta;
  query: ExpirationReportQuery;
}

function pageHref(query: ExpirationReportQuery, page: number): string {
  const searchParams = new URLSearchParams();
  if (query.fromDate) searchParams.set('fromDate', query.fromDate);
  if (query.toDate) searchParams.set('toDate', query.toDate);
  if (query.withinDays !== undefined)
    searchParams.set('withinDays', String(query.withinDays));
  searchParams.set('page', String(page));
  return `/reports/expirations?${searchParams.toString()}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function ExpirationReportTable({
  items,
  meta,
  query,
}: ExpirationReportTableProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <Clock className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">
          Nenhum item com vencimento próximo encontrado.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste o intervalo para ampliar a consulta.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(13rem,2fr)_minmax(7rem,0.8fr)_minmax(5rem,0.6fr)_minmax(6rem,0.7fr)] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>Produto</span>
          <span>Vencimento</span>
          <span>Qtd. recebida</span>
          <span>Dias restantes</span>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => {
            const urgent = item.daysUntilExpiration <= 3;
            return (
              <div
                key={item.orderItemId}
                className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 md:grid-cols-[minmax(13rem,2fr)_minmax(7rem,0.8fr)_minmax(5rem,0.6fr)_minmax(6rem,0.7fr)] md:items-center md:gap-4"
              >
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <p className="break-words text-sm font-semibold">
                    {item.productCode}
                  </p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                    Vencimento
                  </p>
                  <p>{formatDate(item.expirationDate)}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                    Qtd. recebida
                  </p>
                  <p>
                    {item.quantityReceived}{' '}
                    {item.quantityReceived === 1 ? 'unidade' : 'unidades'}
                  </p>
                </div>
                <div
                  className={cn(
                    'col-span-2 text-sm md:col-span-1',
                    urgent && 'text-destructive',
                  )}
                >
                  <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                    Dias restantes
                  </p>
                  <p className="font-semibold">
                    {item.daysUntilExpiration}{' '}
                    {Math.abs(item.daysUntilExpiration) === 1 ? 'dia' : 'dias'}
                  </p>
                  {urgent ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      Vencimento iminente
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {items[0]?.note}
      </p>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Página {meta.page} de {Math.max(meta.totalPages, 1)}
          <span className="hidden sm:inline">
            {' '}· {meta.total} {meta.total === 1 ? 'item' : 'itens'}
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
