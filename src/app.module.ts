import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TelegramModule } from './channels/telegram/telegram.module';
import { WidgetModule } from './channels/widget/widget.module';
import appConfig from './config/app.config';
import llmConfig from './config/llm.config';
import { CoreModule } from './core/core.module';
import { PrismaDatabaseModule } from './database/prisma-database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, llmConfig],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    PrismaDatabaseModule,
    CoreModule,
    TelegramModule,
    WidgetModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
