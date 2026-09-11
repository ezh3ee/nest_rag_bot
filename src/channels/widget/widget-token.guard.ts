import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import appConfig from '../../config/app.config';

@Injectable()
export class WidgetTokenGuard implements CanActivate {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-widget-token'];

    if (typeof token !== 'string' || token !== this.config.WIDGET_TOKEN) {
      throw new UnauthorizedException('Invalid widget token');
    }
    return true;
  }
}
