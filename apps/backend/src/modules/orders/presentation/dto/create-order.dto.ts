import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const moneyPattern = /^\d{1,10}(?:\.\d{1,2})?$/;

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export class CreateOrderItemDto {
  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(1)
  quantityOrdered!: number;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(moneyPattern)
  catalogUnitPrice!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(moneyPattern)
  purchaseUnitPrice!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(moneyPattern)
  originalUnitPrice!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CreateOrderDto {
  @IsUUID('4')
  brandId!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  cycle!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  orderDate!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
