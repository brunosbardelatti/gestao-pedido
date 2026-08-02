import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const moneyPattern = /^\d+(?:\.\d{1,2})?$/;

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export class CreateProductDto {
  @IsUUID('4')
  brandId!: string;

  @IsUUID('4')
  categoryId!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(moneyPattern)
  catalogPrice!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(moneyPattern)
  purchasePrice!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @Matches(moneyPattern)
  originalPrice!: string;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsOptional()
  @IsString()
  @Matches(moneyPattern)
  suggestedSalePrice?: string | null;
}
