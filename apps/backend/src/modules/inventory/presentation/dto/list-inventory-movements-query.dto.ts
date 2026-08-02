import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

import type { InventoryMovementKind } from '../../application/ports/list-inventory-movements-persistence';

const movementTypes = [
  'PURCHASE',
  'SALE',
  'SALE_CANCELLATION',
  'CORRECTION',
  'PERSONAL_USE',
  'RETURN',
] as const;

export class ListInventoryMovementsQueryDto {
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
  @IsUUID('4')
  productId?: string;

  @IsOptional()
  @IsEnum(movementTypes)
  type?: InventoryMovementKind;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  endDate?: string;
}
