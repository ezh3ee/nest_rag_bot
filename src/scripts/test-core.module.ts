import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../config/app.config';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
    }),
    CoreModule,
  ],
})
export class TestCoreModule {}
