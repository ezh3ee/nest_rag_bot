import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './channels/telegram/telegram.module';
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
    PrismaDatabaseModule,
    CoreModule,
    TelegramModule,
  ],
})
export class AppModule {}
