import { IsBoolean } from 'class-validator';

export class SetBrandActiveDto {
  @IsBoolean()
  active!: boolean;
}
