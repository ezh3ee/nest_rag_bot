import {
  Body,
  Controller,
  Post,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ChatReply } from '../../core/chat.service';
import { WidgetDailyLimitGuard } from './widget-daily-limit.guard';
import { WidgetExceptionFilter } from './widget-exception.filter';
import { WidgetTokenGuard } from './widget-token.guard';
import { WidgetMessageDto } from './widget.dto';
import { WidgetService } from './widget.service';

type WidgetReply = {
  success: boolean;
  data?: ChatReply;
};

@Controller('widget')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(WidgetTokenGuard, WidgetDailyLimitGuard)
@UseFilters(WidgetExceptionFilter)
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Post()
  async onChatMessage(@Body() widgetMessageDto: WidgetMessageDto): Promise<WidgetReply> {
    const res = await this.widgetService.handleMessage(widgetMessageDto.message);

    return {
      success: true,
      data: res,
    };
  }
}
