import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleMinus,
  Pencil,
  UserSearch,
} from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type {
  CustomerDetails,
  CustomerListMeta,
  CustomerListQuery,
} from '@/lib/customers';
import { cn } from '@/lib/utils';

interface CustomerListProps {
  customers: CustomerDetails[];
  meta: CustomerListMeta;
  query: CustomerListQuery;
}

function pageHref(query: CustomerListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.cpf) params.set('cpf', query.cpf);
  if (query.phone) params.set('phone', query.phone);
  params.set('page', String(page));
  return `/customers?${params.toString()}`;
}

export function CustomerList({
  customers,
  meta,
  query,
}: CustomerListProps): React.JSX.Element {
  if (customers.length === 0) {
    return (
      <div className="border-y border-border py-14 text-center">
        <UserSearch className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">Nenhum cliente encontrado.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros para ampliar a consulta.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-y border-border">
        <div className="hidden grid-cols-[minmax(12rem,1.8fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(5rem,0.6fr)_2.5rem] gap-4 border-b border-border px-1 py-3 text-xs font-semibold text-muted-foreground md:grid">
          <span>Cliente</span>
          <span>CPF</span>
          <span>Telefone</span>
          <span>Localidade</span>
          <span>Situação</span>
          <span className="sr-only">Ações</span>
        </div>
        <div className="divide-y divide-border">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="grid grid-cols-2 gap-x-4 gap-y-4 px-1 py-4 md:grid-cols-[minmax(12rem,1.8fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(5rem,0.6fr)_2.5rem] md:items-center md:gap-4"
            >
              <p className="col-span-2 break-words text-sm font-semibold md:col-span-1">
                {customer.name}
              </p>
              <Data label="CPF" value={customer.cpf ?? 'Não informado'} />
              <Data label="Telefone" value={customer.phone ?? 'Não informado'} />
              <Data
                label="Localidade"
                value={
                  customer.city
                    ? `${customer.city}${customer.state ? ` / ${customer.state}` : ''}`
                    : 'Não informada'
                }
              />
              <div className="text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
                  Situação
                </p>
                <span className="inline-flex items-center gap-1.5">
                  {customer.active ? (
                    <CircleCheck className="size-4 text-ring" aria-hidden />
                  ) : (
                    <CircleMinus className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  {customer.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="col-span-2 flex justify-end md:col-span-1">
                <Link
                  href={`/customers/${customer.id}/edit`}
                  aria-label={`Editar cliente ${customer.name}`}
                  title={`Editar ${customer.name}`}
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
            {' '}· {meta.total} {meta.total === 1 ? 'cliente' : 'clientes'}
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
            <DisabledPageIcon><ChevronLeft className="size-4" /></DisabledPageIcon>
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
            <DisabledPageIcon><ChevronRight className="size-4" /></DisabledPageIcon>
          )}
        </div>
      </div>
    </>
  );
}

function Data({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0 text-sm">
      <p className="mb-1 text-xs font-semibold text-muted-foreground md:hidden">
        {label}
      </p>
      <p className="break-words">{value}</p>
    </div>
  );
}

function DisabledPageIcon({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'pointer-events-none opacity-40',
      )}
    >
      {children}
    </span>
  );
}
