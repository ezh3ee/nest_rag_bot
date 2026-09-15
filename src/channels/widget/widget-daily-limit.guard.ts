import { CanActivate, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { WidgetCounterService } from './widget-counter.service';

@Injectable()
export class WidgetDailyLimitGuard implements CanActivate {
  constructor(private readonly counter: WidgetCounterService) {}

  async canActivate(): Promise<boolean> {
    const allowed = await this.counter.check();
    if (!allowed) {
      throw new HttpException('Widget daily limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
