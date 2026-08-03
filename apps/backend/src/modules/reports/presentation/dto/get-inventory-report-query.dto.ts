import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import type {
  InventoryReportSort,
  ReportSortOrder,
} from '../../application/ports/get-inventory-report-persistence';

export class GetInventoryReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.normalize('NFKC').trim() || undefined
      : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsIn(['description', 'brandName', 'balance', 'suggestedSalePrice'])
  sortBy: InventoryReportSort = 'description';

  @IsIn(['asc', 'desc'])
  sortOrder: ReportSortOrder = 'asc';
}
