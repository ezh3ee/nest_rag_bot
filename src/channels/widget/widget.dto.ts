import { IsNotEmpty, IsString } from 'class-validator';

export class WidgetMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
