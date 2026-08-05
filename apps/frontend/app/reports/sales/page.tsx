import { AlertCircle, ArrowLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { SalesReportSummary } from '@/components/reports/sales-report-summary';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/auth';
import { getSalesReport, type SalesReportQuery } from '@/lib/reports';

interface SalesReportPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function currentUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).valueOf());
}

function parseQuery(
  params: Record<string, string | string[] | undefined>,
): SalesReportQuery {
  const today = currentUtcDate();
  const startDate = stringParam(params.startDate);
  const endDate = stringParam(params.endDate);
  return {
    startDate: validDate(startDate) ? startDate : `${today.slice(0, 8)}01`,
    endDate: validDate(endDate) ? endDate : today,
    includeCanceled: stringParam(params.includeCanceled) === 'true',
  };
}

export default async function SalesReportPage({
  searchParams,
}: SalesReportPageProps): Promise<React.JSX.Element> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const query = parseQuery(await searchParams);
  const report = await getSalesReport(query);

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
          <h1 className="mt-2 text-2xl font-semibold">Vendas por período</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Faturamento e volume consolidados pelos valores registrados nas vendas.
          </p>
        </div>

        <form
          className="mt-7 grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end"
          method="get"
        >
          <div className="space-y-2">
            <Label htmlFor="sales-report-start-date">Data inicial</Label>
            <Input
              id="sales-report-start-date"
              name="startDate"
              type="date"
              defaultValue={query.startDate}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-report-end-date">Data final</Label>
            <Input
              id="sales-report-end-date"
              name="endDate"
              type="date"
              defaultValue={query.endDate}
              required
            />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-medium">
            <input
              type="checkbox"
              name="includeCanceled"
              value="true"
              defaultChecked={query.includeCanceled}
              className="size-4 accent-[var(--ring)]"
            />
            Incluir canceladas
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              Consultar
            </Button>
            <Link
              href="/reports/sales"
              aria-label="Limpar filtros"
              title="Limpar filtros"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <X className="size-4" aria-hidden />
            </Link>
          </div>
        </form>

        {!report ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Não foi possível carregar o relatório de vendas.</span>
          </div>
        ) : (
          <div className="mt-8">
            <SalesReportSummary
              report={report}
              includeCanceled={query.includeCanceled ?? false}
            />
          </div>
        )}
      </section>
    </main>
  );
}
