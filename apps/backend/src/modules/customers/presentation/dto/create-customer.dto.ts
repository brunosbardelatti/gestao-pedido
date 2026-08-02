import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export class CreateCustomerDto {
  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  cpf?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.normalize('NFKC').trim().toUpperCase()
      : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  state?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/)
  postalCode?: string | null;
}
