import { IsString, MinLength } from 'class-validator';

export class ImportNfeDto {
  @IsString()
  @MinLength(1)
  xml!: string;
}
