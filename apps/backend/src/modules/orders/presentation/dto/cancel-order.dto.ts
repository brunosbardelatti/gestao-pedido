import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export class CancelOrderDto {
  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
