import { Inject, Injectable, Logger } from '@nestjs/common';
import type { BeforeApplicationShutdown } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import appConfig from '../config/app.config';

@Injectable()
export class ChatLogService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(ChatLogService.name);
  private queue: Promise<void> = Promise.resolve();

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  write(question: string, answer: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const line = JSON.stringify({ timestamp, question, answer }) + '\n';
    const filePath = join(this.config.CHAT_LOG_DIR, `chat-${timestamp.slice(0, 10)}.jsonl`);

    this.queue = this.queue
      .then(async () => {
        await mkdir(this.config.CHAT_LOG_DIR, { recursive: true });
        await appendFile(filePath, line, { encoding: 'utf8', mode: 0o600 });
      })
      .catch(() => {
        this.logger.error('Failed to write chat log');
      });

    return this.queue;
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.queue;
  }
}
