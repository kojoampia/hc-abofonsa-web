import { InjectionToken } from '@angular/core';

/**
 * Base URL for the content API. In the browser it is origin-relative ({@code /api/v1} — nginx or
 * the dev proxy routes it); during SSR it must be absolute because Node's fetch has no origin,
 * so {@code app.config.server.ts} overrides it from the {@code API_URL} environment variable.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
});
