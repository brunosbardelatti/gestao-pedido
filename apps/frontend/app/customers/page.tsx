import { AlertCircle, ArrowLeft, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CustomerList } from '@/components/customers/customer-list';
import { AppHeader } from '@/components/layout/app-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/auth';
import {
  listCustomers,
  type CustomerListQuery,
  type CustomerListResult,
} from '@/lib/customers';

interface CustomersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): CustomerListQuery {
  const rawPage = Number(stringParam(params.page));
  return {
    search: stringParam(params.search)?.trim() || undefined,
    cpf: stringParam(params.cpf)?.trim() || undefined,
    phone: stringParam(params.phone)?.trim() || undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: CustomerListResult = {
  customers: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const result = await listCustomers(query);
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
            <p className="section-kicker">Clientes</p>
            <h1 className="mt-2 text-2xl font-semibold">Clientes</h1>
          </div>
          <Link href="/customers/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden />
            Cadastrar cliente
          </Link>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.4fr)_1fr_1fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="customer-search">Nome</Label>
            <Input
              id="customer-search"
              name="search"
              defaultValue={query.search}
              maxLength={150}
              placeholder="Buscar por nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-cpf-filter">CPF</Label>
            <Input
              id="customer-cpf-filter"
              name="cpf"
              inputMode="numeric"
              defaultValue={query.cpf}
              maxLength={11}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone-filter">Telefone</Label>
            <Input
              id="customer-phone-filter"
              name="phone"
              inputMode="tel"
              defaultValue={query.phone}
              maxLength={20}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Filtrar
            </Button>
            <Link
              href="/customers"
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
            <span>Não foi possível carregar os clientes.</span>
          </div>
        ) : null}

        <div className="mt-7">
          <CustomerList customers={list.customers} meta={list.meta} query={query} />
        </div>
      </section>
    </main>
  );
}
