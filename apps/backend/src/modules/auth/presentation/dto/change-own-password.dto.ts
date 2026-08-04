import { IsString, Length } from 'class-validator';

export class ChangeOwnPasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
