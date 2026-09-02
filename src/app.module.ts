import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './channels/telegram/telegram.module';
import { CoreModule } from './core/core.module';
import { PrismaDatabaseModule } from './database/prisma-database.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
    }),
    PrismaDatabaseModule,
    CoreModule,
    TelegramModule,
  ],
})
export class AppModule {}
