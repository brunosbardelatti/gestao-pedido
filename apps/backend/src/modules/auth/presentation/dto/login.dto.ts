import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 80)
  login!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
