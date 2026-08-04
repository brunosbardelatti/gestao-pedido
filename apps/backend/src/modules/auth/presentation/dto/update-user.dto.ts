import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

import { USER_ROLES } from '../../domain/entities/auth-user';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: 'ADMIN' | 'OPERATOR';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
