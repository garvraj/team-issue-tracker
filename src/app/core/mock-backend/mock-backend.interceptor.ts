import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, mergeMap, of, throwError, timer } from 'rxjs';
import { MockDb } from './mock-db';
import { ApiError, dispatch } from './routes';

export const USER_HEADER = 'X-User-Id';

const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 450;

/**
 * Serves every `/api/*` request from the in-memory {@link MockDb}, with a
 * simulated network delay. Remove this interceptor to talk to a real backend.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) return next(req);

  const mockDb = inject(MockDb);
  const latency = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);

  return from(mockDb.ready()).pipe(
    mergeMap(() => timer(latency)),
    mergeMap(() => {
      try {
        const body = dispatch(req.method, req.url.split('?')[0], {
          db: mockDb.db,
          body: req.body,
          userId: req.headers.get(USER_HEADER),
          now: () => new Date().toISOString(),
          nextId: (prefix) => mockDb.nextId(prefix),
        });
        if (req.method !== 'GET') mockDb.save();
        // Hand out copies so callers can't mutate the database by accident.
        return of(new HttpResponse({ status: 200, url: req.url, body: structuredClone(body) }));
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 500;
        const message = e instanceof Error ? e.message : 'Unknown error';
        return throwError(() => new HttpErrorResponse({ status, url: req.url, error: { message } }));
      }
    }),
  );
};
