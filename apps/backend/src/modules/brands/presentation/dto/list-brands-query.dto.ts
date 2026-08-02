import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListBrandsQueryDto {
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
}
