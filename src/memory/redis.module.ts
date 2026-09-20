import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Redis } from 'ioredis';
import appConfig from '../config/app.config';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => {
        return new Redis({
          host: config.REDIS_HOST,
          port: 6379,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
