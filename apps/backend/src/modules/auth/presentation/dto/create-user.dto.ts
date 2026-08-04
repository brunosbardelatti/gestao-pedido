import { IsIn, IsString, Length } from 'class-validator';

import { USER_ROLES } from '../../domain/entities/auth-user';

export class CreateUserDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Length(1, 80)
  login!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsIn(USER_ROLES)
  role!: 'ADMIN' | 'OPERATOR';
}
