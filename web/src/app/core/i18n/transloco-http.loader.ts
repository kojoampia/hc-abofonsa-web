import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url';

/**
 * Defaults-plus-overrides loading (spec §10.3): the shipped bundle is merged with the CMS
 * overrides, override wins. Three properties follow, and all three matter: the site renders
 * without the API (the override call failing falls back to `{}`), corrections need no release,
 * and the shipped defaults stay authoritative (deleting an override reverts).
 */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getTranslation(lang: string): Observable<Translation> {
    const defaults$ = this.http.get<Translation>(`/i18n/${lang}.json`);
    const overrides$ = this.http
      .get<Record<string, string>>(`${this.base}/i18n/${lang}.json`)
      .pipe(catchError(() => of({} as Record<string, string>)));

    return forkJoin([defaults$, overrides$]).pipe(
      map(([defaults, overrides]) => ({ ...flatten(defaults), ...overrides })),
    );
  }
}

/** Nested bundle objects flatten to the dot-delimited key namespace (spec §10.2). */
export function flatten(source: Translation, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value as Translation, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}
