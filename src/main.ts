import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');

  app.set('trust proxy', 1);

  if (config.WIDGET_ALLOWED_ORIGIN) {
    app.enableCors({
      origin: config.WIDGET_ALLOWED_ORIGIN,
      methods: ['POST', 'OPTIONS'],
    });
  }

  await app.listen(3000);
  Logger.log('Application started', 'Bootstrap');
}

void bootstrap();
