import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Wraps all JSON controller return values in the legacy API contract:
 *   { success: true, data: ... }
 *
 * Skipped when the handler already returned a wrapper (has `success` key),
 * when it returned a bare token payload (`accessToken` key), or when the
 * handler writes the response itself via @Res() (SSE streams, files).
 */
@Injectable()
export class LegacyResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();

    // Handler owns the response (e.g. chat SSE stream) — do not interfere.
    if (res.headersSent) {
      return next.handle() as Observable<unknown>;
    }

    return next.handle().pipe(
      map((data) => {
        if (res.headersSent) return data;
        if (data === undefined || data === null) {
          return { success: true, data: null };
        }
        if (
          typeof data === 'object' &&
          !Array.isArray(data) &&
          ('success' in data || 'accessToken' in data)
        ) {
          return data; // already wrapped / auth token payload
        }
        return { success: true, data };
      }),
    );
  }
}
