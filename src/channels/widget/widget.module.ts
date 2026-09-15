import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { WidgetController } from './widget.controller';
import { WidgetCounterService } from './widget-counter.service';
import { WidgetDailyLimitGuard } from './widget-daily-limit.guard';
import { WidgetTokenGuard } from './widget-token.guard';
import { WidgetService } from './widget.service';

@Module({
  imports: [CoreModule],
  controllers: [WidgetController],
  providers: [WidgetService, WidgetTokenGuard, WidgetDailyLimitGuard, WidgetCounterService],
})
export class WidgetModule {}
