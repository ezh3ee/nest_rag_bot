import { Body, Controller, Post } from '@nestjs/common';
import { WidgetMessageDto } from './widget.dto';

@Controller('widget')
export class WidgetController {
  @Post()
  onChatMessage(@Body() widgetMessageDto: WidgetMessageDto) {
    console.log(widgetMessageDto.message);
    return widgetMessageDto.message;
  }
}
