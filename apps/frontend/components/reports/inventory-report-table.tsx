import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  InventoryReportItem,
  InventoryReportQuery,
  ReportPaginationMeta,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface InventoryReportTableProps {
  items: InventoryReportItem[];
  meta: ReportPaginationMeta;
  query: InventoryReportQuery;
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function pageHref(query: InventoryReportQuery, page: number): string {
  const searchParams = new URLSearchParams();
  if (query.search) searchParams.set('search', query.search);
  if (query.sortBy) searchParams.set('sortBy', query.sortBy);
  if (query.sortOrder) searchParams.set('sortOrder', query.sortOrder);
  searchParams.set('page', String(page));
  return `/reports/inventory?${searchParams.toString()}`;
}

export function InventoryReportTable({
  items,
  meta,
  query,
}: InventoryReportTableProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <Boxes className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">
          Nenhum produto encontrado no relatório.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste a busca para ampliar a consulta.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(13rem,2fr)_minmax(8rem,1fr)_minmax(9rem,0.9fr)_minmax(8rem,0.8fr)_2.5rem] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>Produto</span>
          <span>Marca</span>
          <span>Preço sugerido</span>
          <span>Saldo</span>
          <span className="sr-only">Ações</span>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.productId}
              className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 md:grid-cols-[minmax(13rem,2fr)_minmax(8rem,1fr)_minmax(9rem,0.9fr)_minmax(8rem,0.8fr)_2.5rem] md:items-center md:gap-4"
            >
              <div className="col-span-2 min-w-0 md:col-span-1">
                <p className="break-words text-sm font-semibold">{item.productCode}</p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Marca
                </p>
                <p className="break-words">{item.brandName}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Preço sugerido
                </p>
                {item.suggestedSalePrice ? (
                  <p>{currency.format(Number(item.suggestedSalePrice))}</p>
                ) : (
                  <p className="text-muted-foreground">Sem preço sugerido</p>
                )}
              </div>
              <div
                className={cn(
                  'col-span-2 text-sm md:col-span-1',
                  item.balance < 0 && 'text-destructive',
                )}
              >
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Saldo
                </p>
                <p className="font-semibold">
                  {item.balance} {Math.abs(item.balance) === 1 ? 'unidade' : 'unidades'}
                </p>
                {item.balance < 0 ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    Estoque negativo
                  </p>
                ) : null}
              </div>
              <div className="col-span-2 flex justify-end md:col-span-1">
                <Link
                  href={`/products/${item.productId}/edit`}
                  aria-label={`Abrir produto ${item.productCode}`}
                  title={`Abrir ${item.productCode}`}
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                >
                  <Eye className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          ))}
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
