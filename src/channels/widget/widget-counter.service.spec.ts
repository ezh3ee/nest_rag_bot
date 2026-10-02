import type { ConfigType } from '@nestjs/config';
import appConfig from '../../config/app.config';
import { PrismaService } from '../../database/prisma.service';
import { WidgetCounterService } from './widget-counter.service';

const COUNTER_ID = 'widget';

type CounterDelegate = {
  findUnique: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const buildService = (dailyLimit = 200) => {
  const delegate: CounterDelegate = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { widgetCounter: delegate };
  const config = { WIDGET_DAILY_LIMIT: dailyLimit };

  const service = new WidgetCounterService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigType<typeof appConfig>,
  );

  return { service, delegate };
};

describe('WidgetCounterService.check', () => {
  it('opens a fresh counter for the day when no row exists yet', async () => {
    const { service, delegate } = buildService();
    delegate.findUnique.mockResolvedValue(null);

    await expect(service.check()).resolves.toBe(true);

    expect(delegate.upsert).toHaveBeenCalledWith({
      where: { id: COUNTER_ID },
      create: { id: COUNTER_ID, date: today(), count: 0 },
      update: { date: today(), count: 0 },
    });
  });

  it('resets the counter when the stored date is not today', async () => {
    const { service, delegate } = buildService();
    delegate.findUnique.mockResolvedValue({ id: COUNTER_ID, date: '2020-01-01', count: 150 });

    await expect(service.check()).resolves.toBe(true);

    expect(delegate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { date: today(), count: 0 },
      }),
    );
  });

  it('allows a request while the daily count is below the limit', async () => {
    const { service, delegate } = buildService(200);
    delegate.findUnique.mockResolvedValue({ id: COUNTER_ID, date: today(), count: 199 });

    await expect(service.check()).resolves.toBe(true);

    expect(delegate.upsert).not.toHaveBeenCalled();
  });

  it('blocks a request once the daily count reaches the limit', async () => {
    const { service, delegate } = buildService(200);
    delegate.findUnique.mockResolvedValue({ id: COUNTER_ID, date: today(), count: 200 });

    await expect(service.check()).resolves.toBe(false);

    expect(delegate.upsert).not.toHaveBeenCalled();
  });
});

describe('WidgetCounterService.increment', () => {
  it('bumps the counter by exactly one', async () => {
    const { service, delegate } = buildService();

    await service.increment();

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: COUNTER_ID },
      data: { count: { increment: 1 } },
    });
  });
});
