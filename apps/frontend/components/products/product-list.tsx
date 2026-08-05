import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  PackageSearch,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ProductDetails,
  ProductListMeta,
  ProductListQuery,
} from '@/lib/products';

interface ProductListProps {
  products: ProductDetails[];
  meta: ProductListMeta;
  query: ProductListQuery;
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatPrice(value: string): string {
  return priceFormatter.format(Number(value));
}

function pageHref(query: ProductListQuery, page: number): string {
  const searchParams = new URLSearchParams();

  if (query.search) searchParams.set('search', query.search);
  if (query.brandId) searchParams.set('brandId', query.brandId);
  if (query.categoryId) searchParams.set('categoryId', query.categoryId);
  if (query.active !== undefined) {
    searchParams.set('active', String(query.active));
  }
  searchParams.set('page', String(page));

  return `/products?${searchParams.toString()}`;
}

export function ProductList({
  products,
  meta,
  query,
}: ProductListProps): React.JSX.Element {
  if (products.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <PackageSearch
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm font-semibold">Nenhum produto encontrado.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros para ampliar a consulta.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(8rem,0.9fr)_minmax(5rem,0.6fr)_2.5rem] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>Produto</span>
          <span>Marca</span>
          <span>Categoria</span>
          <span>Preço sugerido</span>
          <span>Situação</span>
          <span className="sr-only">Ações</span>
        </div>
        <div className="divide-y divide-border">
          {products.map((product) => (
            <div
              key={product.id}
              className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 md:grid-cols-[minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(8rem,0.9fr)_minmax(5rem,0.6fr)_2.5rem] md:items-center md:gap-4"
            >
              <div className="col-span-2 min-w-0 md:col-span-1">
                <p className="break-words text-sm font-semibold">{product.code}</p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {product.description}
                </p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Marca
                </p>
                <p className="break-words">{product.brand.name}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Categoria
                </p>
                <p className="break-words">{product.category.name}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Preço sugerido
                </p>
                {product.suggestedSalePrice ? (
                  <p>{formatPrice(product.suggestedSalePrice)}</p>
                ) : (
                  <p className="text-muted-foreground">Sem preço sugerido</p>
                )}
              </div>
              <div className="text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Situação
                </p>
                <span className="inline-flex items-center gap-1.5">
                  {product.active ? (
                    <CheckCircle2 className="size-4 text-ring" aria-hidden />
                  ) : (
                    <CircleMinus
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  {product.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="col-span-2 flex justify-end md:col-span-1">
                <Link
                  href={`/products/${product.id}/edit`}
                  aria-label={`Editar produto ${product.code}`}
                  title={`Editar ${product.code}`}
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                >
                  <Pencil className="size-4" aria-hidden />
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
