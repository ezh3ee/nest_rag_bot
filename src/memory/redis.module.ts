import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import appConfig from '../config/app.config';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [appConfig.KEY],
      useFactory: async (config: ConfigType<typeof appConfig>): Promise<RedisClientType> => {
        const client = createClient({
          socket: {
            host: config.REDIS_HOST,
            port: 6379,
          },
        });

        client.on('error', (err) => console.error('Redis Client Error', err));

        await client.connect();
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
