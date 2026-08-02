import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/\S/)
  reason!: string;
}
