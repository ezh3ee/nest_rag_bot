import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';

@Module({
  imports: [CoreModule],
  controllers: [WidgetController],
  providers: [WidgetService],
})
export class WidgetModule {}
