import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import type { OrderListStatus } from '../../application/ports/list-orders-persistence';

const orderStatuses = ['OPEN', 'RECEIVED', 'CANCELED'] as const;

export class ListOrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsEnum(orderStatuses)
  status?: OrderListStatus;

  @IsOptional()
  @IsUUID('4')
  brandId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFKC').trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  cycle?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  endDate?: string;
}
