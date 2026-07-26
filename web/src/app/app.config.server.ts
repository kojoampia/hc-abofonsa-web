import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from './core/api/api-base-url';
import { provideSiteIndexable } from './core/seo/indexable';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Search-engine indexing is opt-in: anything other than the exact string "true" leaves this
    // deployment excluded. See core/seo/indexable.ts for why the default runs in that direction.
    provideSiteIndexable(process.env['SITE_INDEXABLE'] === 'true'),
    {
      // During SSR, HttpClient's fetch has no origin - the API base must be absolute. In the
      // Phase 17 compose stack API_URL points at the api service's compose DNS name.
      provide: API_BASE_URL,
      useFactory: () => (process.env['API_URL'] ?? 'http://localhost:8080') + '/api/v1',
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
