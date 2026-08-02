import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

import type { InventoryAdjustmentType } from '../../application/ports/adjust-stock-persistence';

export class AdjustStockDto {
  @IsUUID('4')
  productId!: string;

  @IsIn(['CORRECTION', 'PERSONAL_USE', 'RETURN'])
  type!: InventoryAdjustmentType;

  @IsInt()
  @NotEquals(0)
  @Min(-2_147_483_648)
  @Max(2_147_483_647)
  quantityDelta!: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.normalize('NFKC').trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  confirmNegativeStock = false;
}
