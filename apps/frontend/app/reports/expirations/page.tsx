import { AlertCircle, ArrowLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { ExpirationReportTable } from '@/components/reports/expiration-report-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/auth';
import {
  getExpirationReport,
  type ExpirationReportQuery,
  type ExpirationReportResult,
} from '@/lib/reports';

interface ExpirationReportPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).valueOf());
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): ExpirationReportQuery {
  const fromDate = stringParam(params.fromDate);
  const toDate = stringParam(params.toDate);
  const rawWithinDays = Number(stringParam(params.withinDays));
  const rawPage = Number(stringParam(params.page));
  return {
    fromDate: validDate(fromDate) ? fromDate : undefined,
    toDate: validDate(toDate) ? toDate : undefined,
    withinDays:
      Number.isInteger(rawWithinDays) && rawWithinDays > 0
        ? rawWithinDays
        : undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: 20,
  };
}

const emptyResult: ExpirationReportResult = {
  items: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

export default async function ExpirationReportPage({
  searchParams,
}: ExpirationReportPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const result = await getExpirationReport(query);
  const report = result ?? {
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

        <div className="mt-8">
          <p className="section-kicker">Relatórios</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Produtos próximos do vencimento
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Itens recebidos com validade dentro do intervalo consultado.
          </p>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.7fr_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="expiration-report-from-date">Data inicial</Label>
            <Input
              id="expiration-report-from-date"
              name="fromDate"
              type="date"
              defaultValue={query.fromDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiration-report-to-date">Data final</Label>
            <Input
              id="expiration-report-to-date"
              name="toDate"
              type="date"
              defaultValue={query.toDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiration-report-within-days">Dias à frente</Label>
            <Input
              id="expiration-report-within-days"
              name="withinDays"
              type="number"
              min={1}
              defaultValue={query.withinDays}
              placeholder="7"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Consultar
            </Button>
            <Link
              href="/reports/expirations"
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
            <span>
              Não foi possível carregar o relatório de vencimentos.
            </span>
          </div>
        ) : null}

        <div className="mt-7">
          <ExpirationReportTable
            items={report.items}
            meta={report.meta}
            query={query}
          />
        </div>
      </section>
    </main>
  );
}
