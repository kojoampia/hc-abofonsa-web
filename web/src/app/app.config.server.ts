import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from './core/api/api-base-url';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      // During SSR, HttpClient's fetch has no origin - the API base must be absolute. In the
      // Phase 17 compose stack API_URL points at the api service's compose DNS name.
      provide: API_BASE_URL,
      useFactory: () => (process.env['API_URL'] ?? 'http://localhost:8080') + '/api/v1',
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
