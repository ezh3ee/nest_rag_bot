import { HttpException, HttpStatus } from '@nestjs/common';
import { WidgetCounterService } from './widget-counter.service';
import { WidgetDailyLimitGuard } from './widget-daily-limit.guard';

const buildGuard = (allowed: boolean) => {
  const check = jest.fn().mockResolvedValue(allowed);
  const counter = { check } as unknown as WidgetCounterService;

  return { guard: new WidgetDailyLimitGuard(counter), check };
};

const capture = async (run: () => Promise<unknown>): Promise<unknown> =>
  run().catch((error: unknown) => error);

describe('WidgetDailyLimitGuard', () => {
  it('lets the request through while the budget lasts', async () => {
    const { guard, check } = buildGuard(true);

    await expect(guard.canActivate()).resolves.toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('answers 429 once the counter refuses', async () => {
    const { guard } = buildGuard(false);

    const error = await capture(() => guard.canActivate());

    expect(error).toBeInstanceOf(HttpException);
    if (!(error instanceof HttpException)) throw new Error('ожидался HttpException');
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.message).toBe('Widget daily limit exceeded');
  });
});
