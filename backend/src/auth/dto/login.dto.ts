import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  identifier: string;

  @IsString()
  @MinLength(6)
  password: string;
}
