import type {
  ExpirationReportAggregate,
  GetExpirationReportPersistence,
} from '../ports/get-expiration-report-persistence';

export interface GetExpirationReportInput {
  page: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  withinDays?: number;
}

export interface ExpirationReportItem extends ExpirationReportAggregate {
  daysUntilExpiration: number;
  note: string;
}

export interface GetExpirationReportOutput {
  items: ExpirationReportItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const indicativeNote =
  'Indicativo: o MVP não controla consumo de estoque por lote.';

function addUtcDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((toTime - fromTime) / 86_400_000);
}

export class GetExpirationReportUseCase {
  constructor(
    private readonly persistence: GetExpirationReportPersistence,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    input: GetExpirationReportInput,
  ): Promise<GetExpirationReportOutput> {
    const today = this.now().toISOString().slice(0, 10);
    const fromDate = input.fromDate ?? today;
    const toDate =
      input.toDate ?? addUtcDays(fromDate, input.withinDays ?? 7);
    const result = await this.persistence.getExpirations({
      page: input.page,
      pageSize: input.pageSize,
      fromDate,
      toDate,
    });

    return {
      items: result.items.map((item) => ({
        ...item,
        daysUntilExpiration: daysBetween(today, item.expirationDate),
        note: indicativeNote,
      })),
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize),
      },
    };
  }
}
