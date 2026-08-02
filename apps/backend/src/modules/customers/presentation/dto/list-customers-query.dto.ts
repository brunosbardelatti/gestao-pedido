import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function normalizedOptional(value: unknown): unknown {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim() || undefined
    : value;
}

export class ListCustomersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Transform(({ value }: { value: unknown }) => normalizedOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @Transform(({ value }: { value: unknown }) => normalizedOptional(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  cpf?: string;

  @Transform(({ value }: { value: unknown }) => normalizedOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
