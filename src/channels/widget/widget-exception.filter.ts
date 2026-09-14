import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class WidgetExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WidgetExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    this.logger.error(
      `${request.method} ${request.url} -> ${status}`,
      exception instanceof Error ? exception.stack : '',
    );

    // 5xx наружу не отдаём внутреннее сообщение — там могут быть детали драйвера/провайдера
    let clientMessage = 'Internal server error';
    if (status < 500 && exception instanceof HttpException) {
      const res = exception.getResponse();
      const raw = typeof res === 'string' ? res : (res as { message?: string | string[] }).message;
      clientMessage = (Array.isArray(raw) ? raw.join('; ') : raw) ?? exception.message;
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      message: clientMessage,
      success: false,
    });
  }
}
