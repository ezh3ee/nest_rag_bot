import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [CoreModule],
  providers: [TelegramService],
})
export class TelegramModule {}
