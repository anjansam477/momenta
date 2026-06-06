import { Observable, timer, throwError } from 'rxjs';
import { retry, timeout } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

export interface RetryOptions {
  /** Max retry attempts after the initial request (default 2). */
  count?: number;
  /** Per-attempt timeout in ms (default 15000). */
  timeoutMs?: number;
  /** Base backoff delay in ms; doubles each attempt (default 500). */
  baseDelayMs?: number;
}

/**
 * RxJS operator: time out slow requests and retry only *transient* failures
 * (network down, request timeout, HTTP 5xx, 429) with exponential backoff.
 *
 * SAFETY: only apply to idempotent reads (GET). Retrying POST/PUT/DELETE can
 * duplicate writes.
 *
 *   this.http.get<T>(url).pipe(retryWithBackoff());
 */
export function retryWithBackoff<T>(opts: RetryOptions = {}) {
  const count = opts.count ?? 2;
  const timeoutMs = opts.timeoutMs ?? 15000;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  return (source: Observable<T>): Observable<T> =>
    source.pipe(
      timeout(timeoutMs),
      retry({
        count,
        delay: (error, retryCount) => {
          const status = (error as HttpErrorResponse)?.status;
          const isTransient =
            status === 0 ||
            status === undefined ||
            status >= 500 ||
            status === 429 ||
            (error as { name?: string })?.name === 'TimeoutError';

          // Non-transient (4xx etc.) — fail immediately, don't retry.
          if (!isTransient) return throwError(() => error);
          return timer(baseDelayMs * Math.pow(2, retryCount - 1));
        },
      }),
    );
}
