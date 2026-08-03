import type {
  GetMarginReportPersistence,
  MarginReportAggregate,
} from '../ports/get-margin-report-persistence';

export interface GetMarginReportInput {
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  productId?: string;
}

export interface MarginReportItem extends MarginReportAggregate {
  margin: string;
  marginPercent: number | null;
}

export interface GetMarginReportOutput {
  items: MarginReportItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function moneyToCents(value: string): number {
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

function centsToMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

function calculateMargin(item: MarginReportAggregate): MarginReportItem {
  const revenueCents = moneyToCents(item.revenue);
  const marginCents = revenueCents - moneyToCents(item.cost);
  return {
    ...item,
    margin: centsToMoney(marginCents),
    marginPercent:
      revenueCents === 0
        ? null
        : Number(((marginCents / revenueCents) * 100).toFixed(2)),
  };
}

export class GetMarginReportUseCase {
  constructor(private readonly persistence: GetMarginReportPersistence) {}

  async execute(input: GetMarginReportInput): Promise<GetMarginReportOutput> {
    const result = await this.persistence.getMargins(input);
    return {
      items: result.items.map(calculateMargin),
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize),
      },
    };
  }
}
