import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';

interface CacheEntry {
  value: unknown;
  storedAt: number;
}

/**
 * Shared GET cache for widget data.
 *
 * - Identical requests made at the same time share one HTTP call (two weather widgets
 *   for the same city, or widgets re-created when the page carousel rotates).
 * - Responses are reused for `ttlMs`; keep TTLs below a widget's own refresh interval
 *   so scheduled refreshes still get fresh data.
 * - If a refresh fails, the last good value is returned instead of an error
 *   (stale-if-error), so a brief network blip doesn't blank a widget.
 */
@Injectable({ providedIn: 'root' })
export class DataCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Observable<unknown>>();
  private static readonly MAX_ENTRIES = 200;

  constructor(private http: HttpClient) {}

  get<T>(url: string, ttlMs: number): Observable<T> {
    return this.fetch<T>('json:' + url, ttlMs, () => this.http.get<T>(url));
  }

  getText(url: string, ttlMs: number): Observable<string> {
    return this.fetch<string>('text:' + url, ttlMs, () => this.http.get(url, { responseType: 'text' }));
  }

  private fetch<T>(key: string, ttlMs: number, request: () => Observable<T>): Observable<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.storedAt < ttlMs) {
      return of(cached.value as T);
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Observable<T>;
    }
    const shared = request().pipe(
      tap(value => this.store(key, value)),
      catchError(err => (cached ? of(cached.value as T) : throwError(() => err))),
      finalize(() => this.inFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inFlight.set(key, shared);
    return shared;
  }

  private store(key: string, value: unknown): void {
    if (this.cache.size >= DataCacheService.MAX_ENTRIES && !this.cache.has(key)) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, storedAt: Date.now() });
  }
}
