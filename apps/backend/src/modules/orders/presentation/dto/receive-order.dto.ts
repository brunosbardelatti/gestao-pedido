import { Transform, Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';

function normalizeString(value: unknown): unknown {
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

export class ReceiveOrderItemDto {
  @IsUUID('4')
  orderItemId!: string;

  @IsInt()
  @Min(0)
  quantityReceived!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  expirationDate?: string | null;

  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class ReceiveOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveOrderItemDto)
  items!: ReceiveOrderItemDto[];
}
