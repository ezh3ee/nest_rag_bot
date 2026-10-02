import { ArgumentsHost, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WidgetExceptionFilter } from './widget-exception.filter';

type JsonBody = {
  statusCode: number;
  path: string;
  message: string;
  success: boolean;
};

const buildHost = (method = 'POST', url = '/widget') => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method, url }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
};

const bodyOf = (json: jest.Mock): JsonBody => json.mock.calls[0][0] as JsonBody;

describe('WidgetExceptionFilter', () => {
  const filter = new WidgetExceptionFilter();

  it('mirrors the status and message of an HttpException', () => {
    const { host, status, json } = buildHost();

    filter.catch(new UnauthorizedException('Invalid widget token'), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(bodyOf(json)).toEqual({
      statusCode: 401,
      path: '/widget',
      message: 'Invalid widget token',
      success: false,
    });
  });

  it('keeps the 400 of a validation error', () => {
    const { host, status, json } = buildHost();

    filter.catch(new BadRequestException('message should not be empty'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(bodyOf(json).success).toBe(false);
  });

  it('does not leak internals of an unexpected error', () => {
    const { host, status, json } = buildHost('POST', '/widget');

    filter.catch(new Error('connect ECONNREFUSED 127.0.0.1:6379'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(bodyOf(json)).toEqual({
      statusCode: 500,
      path: '/widget',
      message: 'Internal Server Error',
      success: false,
    });
  });

  it('handles a thrown non-Error value', () => {
    const { host, status, json } = buildHost();

    filter.catch('что-то пошло не так', host);

    expect(status).toHaveBeenCalledWith(500);
    expect(bodyOf(json).message).toBe('Internal Server Error');
  });

  it('reports the request path it failed on', () => {
    const { host, json } = buildHost('GET', '/widget/health');

    filter.catch(new Error('boom'), host);

    expect(bodyOf(json).path).toBe('/widget/health');
  });
});
