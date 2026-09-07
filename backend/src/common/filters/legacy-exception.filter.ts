import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Converts every error into the legacy API contract:
 *   { success: false, error: "message" }
 *
 * The frontend checks `json?.success` and surfaces `json?.error`, so this
 * must cover Nest HttpExceptions (BadRequest/NotFound/Forbidden/Conflict),
 * Prisma known errors (P2025/P2002), and unexpected errors.
 */
@Catch()
export class LegacyExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('LegacyExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // Response already streaming (e.g. SSE) — nothing we can safely write.
    if (res.headersSent) return;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (typeof b.message === 'string') {
          message = b.message;
        } else if (Array.isArray(b.message) && b.message.length > 0) {
          message = b.message.join(', ');
        } else if (typeof b.error === 'string') {
          message = b.error;
        }
      }
    } else {
      const code = (exception as { code?: string })?.code;
      if (code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else if (code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with these details already exists';
      } else {
        this.logger.error(
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    }

    res.status(status).json({ success: false, error: message });
  }
}
