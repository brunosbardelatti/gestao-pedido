import type {
  GetSalesReportPersistence,
  SalesReportTotals,
} from '../ports/get-sales-report-persistence';

export interface GetSalesReportInput {
  startDate: string;
  endDate: string;
  includeCanceled?: boolean;
}

export interface GetSalesReportOutput extends SalesReportTotals {
  startDate: string;
  endDate: string;
}

export class GetSalesReportUseCase {
  constructor(private readonly persistence: GetSalesReportPersistence) {}

  async execute(input: GetSalesReportInput): Promise<GetSalesReportOutput> {
    const totals = await this.persistence.getSalesTotals({
      startDate: input.startDate,
      endDate: input.endDate,
      includeCanceled: input.includeCanceled ?? false,
    });

    return {
      startDate: input.startDate,
      endDate: input.endDate,
      ...totals,
    };
  }
}
