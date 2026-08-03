import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ApproveImportedOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantityOrdered!: number;

  @Matches(/^\d+\.\d{2}$/)
  catalogUnitPrice!: string;

  @Matches(/^\d+\.\d{2}$/)
  purchaseUnitPrice!: string;

  @Matches(/^\d+\.\d{2}$/)
  originalUnitPrice!: string;

  @IsOptional()
  @IsDateString({ strict: true, strictSeparator: true })
  expirationDate?: string;
}

export class ApproveImportedOrderDto {
  @IsUUID()
  brandId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  cycle!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  orderDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApproveImportedOrderItemDto)
  items!: ApproveImportedOrderItemDto[];
}
