import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WidgetGuard implements CanActivate {
  private readonly logger = new Logger(WidgetGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-api-key'];
    if (!key) {
      this.logger.error('Widget guard: no key');
      return false;
    }
    return true;
  }
}
