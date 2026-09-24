import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { randomUUID } from 'crypto';

/**
 * Observability floor for route handlers (Phase 0, OBS-1).
 *
 * Wraps a route handler so that:
 *   - every request carries an id (Vercel's x-vercel-id when present, else a
 *     UUID), echoed back as the x-request-id response header;
 *   - an error that escapes the handler is reported to Sentry with the id,
 *     route and method as tags, and becomes a JSON {error, code, requestId}
 *     500 instead of Next's HTML error page;
 *   - a 5xx the handler returns on its own (the existing catch blocks that
 *     console.error and return 500) is also reported to Sentry, so failures
 *     are visible without touching those blocks yet.
 *
 * It changes no handler logic. Phase 4 extends it with zod parsing, the role
 * option and the shared error codes.
 */
type RouteHandler<Args extends unknown[]> = (...args: Args) => Promise<Response> | Response;

export function withRoute<Args extends unknown[]>(
  handler: RouteHandler<Args>
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    const request = args[0] instanceof Request ? args[0] : undefined;
    const requestId = request?.headers.get('x-vercel-id') ?? randomUUID();
    const method = request?.method ?? 'UNKNOWN';
    const route = request ? new URL(request.url).pathname : 'unknown';

    try {
      const response = await handler(...args);
      setRequestId(response, requestId);

      if (response.status >= 500) {
        Sentry.captureMessage(`${method} ${route} returned ${response.status}`, {
          level: 'error',
          tags: { request_id: requestId, route, method, status: String(response.status) },
        });
      }
      return response;
    } catch (error) {
      console.error(`[${requestId}] ${method} ${route} threw:`, error);
      Sentry.captureException(error, {
        tags: { request_id: requestId, route, method },
      });
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR', requestId },
        { status: 500, headers: { 'x-request-id': requestId } }
      );
    }
  };
}

function setRequestId(response: Response, requestId: string): void {
  try {
    response.headers.set('x-request-id', requestId);
  } catch {
    // Responses with immutable headers (e.g. passed through from fetch) keep
    // their headers; the id is still on the Sentry event and in the logs.
  }
}
