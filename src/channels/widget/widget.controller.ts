import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WidgetMessageDto } from './widget.dto';
import { WidgetDailyLimitGuard } from './widget-daily-limit.guard';
import { WidgetTokenGuard } from './widget-token.guard';
import { WidgetService } from './widget.service';

@Controller('widget')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(WidgetTokenGuard, WidgetDailyLimitGuard)
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Post()
  onChatMessage(@Body() widgetMessageDto: WidgetMessageDto) {
    return this.widgetService.handleMessage(widgetMessageDto.message);
  }
}
