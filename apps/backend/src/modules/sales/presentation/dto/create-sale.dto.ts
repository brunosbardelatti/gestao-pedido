import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export class CreateSaleItemDto {
  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/)
  unitPrice!: string;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID('4')
  customerId?: string | null;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod | null;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  confirmNegativeStock = false;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];
}
