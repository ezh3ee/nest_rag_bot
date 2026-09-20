import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class WidgetMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsString()
  @IsNotEmpty()
  chatId!: string;
}
