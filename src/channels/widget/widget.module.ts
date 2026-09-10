import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';

@Module({
  controllers: [WidgetController],
  providers: [
    WidgetService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class WidgetModule {}
