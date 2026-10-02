import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../../config/app.config';
import { WidgetTokenGuard } from './widget-token.guard';

const TOKEN = 'super-secret-token';

const contextWithHeaders = (headers: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

const buildGuard = () =>
  new WidgetTokenGuard({ WIDGET_TOKEN: TOKEN } as unknown as ConfigType<typeof appConfig>);

describe('WidgetTokenGuard', () => {
  it('allows a request carrying the correct token', () => {
    const guard = buildGuard();

    expect(guard.canActivate(contextWithHeaders({ 'x-widget-token': TOKEN }))).toBe(true);
  });

  it('rejects a wrong token', () => {
    const guard = buildGuard();

    expect(() => guard.canActivate(contextWithHeaders({ 'x-widget-token': 'nope' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request without the header', () => {
    const guard = buildGuard();

    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(UnauthorizedException);
  });

  it('rejects an empty token', () => {
    const guard = buildGuard();

    expect(() => guard.canActivate(contextWithHeaders({ 'x-widget-token': '' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a header that arrived as an array', () => {
    const guard = buildGuard();

    expect(() =>
      guard.canActivate(contextWithHeaders({ 'x-widget-token': [TOKEN, TOKEN] })),
    ).toThrow(UnauthorizedException);
  });
});
