import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  InventoryMeta,
  InventoryMovement,
  InventoryMovementQuery,
  InventoryMovementType,
  InventoryProductReference,
} from '@/lib/inventory';
import { cn } from '@/lib/utils';

interface InventoryMovementListProps {
  movements: InventoryMovement[];
  products: InventoryProductReference[];
  meta: InventoryMeta;
  query: InventoryMovementQuery;
}

const typeLabels: Record<InventoryMovementType, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venda',
  SALE_CANCELLATION: 'Cancelamento de venda',
  CORRECTION: 'Correção',
  PERSONAL_USE: 'Uso pessoal',
  RETURN: 'Devolução',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

function movementOrigin(movement: InventoryMovement): string {
  if (movement.orderItemId) return 'Entrada por pedido';
  if (movement.saleItemId) {
    return movement.type === 'SALE_CANCELLATION'
      ? 'Cancelamento de venda'
      : 'Saída por venda';
  }
  return 'Ajuste manual';
}

function pageHref(query: InventoryMovementQuery, page: number): string {
  const searchParams = new URLSearchParams();

  if (query.productId) searchParams.set('productId', query.productId);
  if (query.type) searchParams.set('type', query.type);
  if (query.startDate) searchParams.set('startDate', query.startDate);
  if (query.endDate) searchParams.set('endDate', query.endDate);
  searchParams.set('page', String(page));

  return `/inventory/movements?${searchParams.toString()}`;
}

export function InventoryMovementList({
  movements,
  products,
  meta,
  query,
}: InventoryMovementListProps): React.JSX.Element {
  if (movements.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <History className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">
          Nenhuma movimentação encontrada.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros para ampliar a consulta.
        </p>
      </div>
    );
  }

  const productsById = new Map(products.map((product) => [product.id, product]));

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(12rem,1.6fr)_minmax(7rem,0.8fr)_minmax(8rem,0.8fr)_minmax(10rem,1fr)_minmax(8rem,0.8fr)_minmax(9rem,0.9fr)] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground lg:grid">
          <span>Produto</span>
          <span>Tipo</span>
          <span>Quantidade</span>
          <span>Origem</span>
          <span>Usuário</span>
          <span>Data</span>
        </div>
        <div className="divide-y divide-border">
          {movements.map((movement) => {
            const product = productsById.get(movement.productId);
            const incoming = movement.quantityDelta > 0;
            const DeltaIcon = incoming ? ArrowDownLeft : ArrowUpRight;
            const quantity = Math.abs(movement.quantityDelta);

            return (
              <div
                key={movement.id}
                className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 lg:grid-cols-[minmax(12rem,1.6fr)_minmax(7rem,0.8fr)_minmax(8rem,0.8fr)_minmax(10rem,1fr)_minmax(8rem,0.8fr)_minmax(9rem,0.9fr)] lg:items-center lg:gap-4"
              >
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <p className="break-words text-sm font-semibold">
                    {product?.code ?? movement.productId}
                  </p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {product?.description ?? 'Produto não localizado'}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">
                    Tipo
                  </p>
                  <p>{typeLabels[movement.type]}</p>
                </div>
                <div className="text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">
                    Quantidade
                  </p>
                  <p
                    className={cn(
                      'inline-flex items-center gap-1 font-semibold',
                      incoming
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-destructive',
                    )}
                  >
                    <DeltaIcon className="size-4" aria-hidden />
                    {incoming ? '+' : '-'}{quantity}{' '}
                    {quantity === 1 ? 'unidade' : 'unidades'}
                  </p>
                </div>
                <div className="col-span-2 min-w-0 text-sm sm:col-span-1">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">
                    Origem
                  </p>
                  <p>{movementOrigin(movement)}</p>
                  {movement.reason ? (
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {movement.reason}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">
                    Usuário
                  </p>
                  <p className="break-words">{movement.createdBy.name}</p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground lg:hidden">
                    Data
                  </p>
                  <p>{dateFormatter.format(new Date(movement.createdAt))}</p>
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
            {' '}· {meta.total}{' '}
            {meta.total === 1 ? 'movimentação' : 'movimentações'}
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
