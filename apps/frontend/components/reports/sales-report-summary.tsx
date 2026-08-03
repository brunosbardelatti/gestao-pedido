import { CalendarDays, CircleCheck, RotateCcw } from 'lucide-react';

import type { SalesReport } from '@/lib/reports';

interface SalesReportSummaryProps {
  report: SalesReport;
  includeCanceled: boolean;
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export function SalesReportSummary({
  report,
  includeCanceled,
}: SalesReportSummaryProps): React.JSX.Element {
  const ScopeIcon = includeCanceled ? RotateCcw : CircleCheck;

  return (
    <section aria-labelledby="sales-report-period">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          <span id="sales-report-period">
            {formatDate(report.startDate)} a {formatDate(report.endDate)}
          </span>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ScopeIcon className="size-3.5" aria-hidden />
          {includeCanceled
            ? 'Inclui vendas canceladas'
            : 'Somente vendas concluídas'}
        </p>
      </div>

      <div className="mt-5 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="py-5 sm:px-5 sm:first:pl-0">
          <p className="text-xs font-semibold text-muted-foreground">Faturamento</p>
          <p className="mt-2 text-xl font-semibold">
            {currency.format(Number(report.revenue))}
          </p>
        </div>
        <div className="py-5 sm:px-5">
          <p className="text-xs font-semibold text-muted-foreground">Vendas</p>
          <p className="mt-2 text-xl font-semibold">
            {report.salesCount} {report.salesCount === 1 ? 'venda' : 'vendas'}
          </p>
        </div>
        <div className="py-5 sm:px-5 sm:last:pr-0">
          <p className="text-xs font-semibold text-muted-foreground">Volume</p>
          <p className="mt-2 text-xl font-semibold">
            {report.itemsCount} {report.itemsCount === 1 ? 'item vendido' : 'itens vendidos'}
          </p>
        </div>
      </div>
    </section>
  );
}
