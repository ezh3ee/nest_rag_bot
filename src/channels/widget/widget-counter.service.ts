import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../database/prisma.service';

const COUNTER_ID = 'widget';

@Injectable()
export class WidgetCounterService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async check(): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const row = await this.prisma.widgetCounter.findUnique({ where: { id: COUNTER_ID } });

    if (!row || row.date !== today) {
      await this.prisma.widgetCounter.upsert({
        where: { id: COUNTER_ID },
        create: { id: COUNTER_ID, date: today, count: 0 },
        update: { date: today, count: 0 },
      });
      return true;
    }

    if (row.count >= this.config.WIDGET_DAILY_LIMIT) {
      return false;
    }
    return true;
  }

  async increment(): Promise<void> {
    await this.prisma.widgetCounter.update({
      where: { id: COUNTER_ID },
      data: { count: { increment: 1 } },
    });
  }
}
