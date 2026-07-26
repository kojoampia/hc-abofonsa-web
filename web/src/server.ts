import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * Angular 22's SSR engine rejects any request whose `Host` (or trusted `X-Forwarded-Host`) header
 * is not on this list — its defence against server-side request forgery through a spoofed host.
 * The list has to name every hostname the app is legitimately served under, so it is configuration,
 * not a constant: production passes the real domains through ALLOWED_HOSTS in
 * infra/prod-server/.env, and the default below covers local development, the compose stack and
 * the e2e suite. `*.example.com` wildcards are supported; a bare `*` disables the check entirely
 * and is deliberately not used.
 */
const allowedHosts = (process.env['ALLOWED_HOSTS'] ?? 'localhost,127.0.0.1,web,[::1]')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  // In production nginx terminates TLS and forwards here over http; without this the app would
  // render absolute URLs as http:// and believe every visitor came from the proxy's address.
  // Only the two headers nginx actually sets are trusted (spec §12.3).
  trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'],
});

/**
 * The browser calls the content API origin-relative (`/api/v1/...`) and loads media from
 * `/media/...`, so this server proxies both to the API container. That keeps one public origin —
 * production's nginx only has to route everything here (spec §2.1's single front door), and the
 * same URLs work in `ng serve` (proxy.conf.json), compose, and production without the app ever
 * knowing which environment it is in.
 */
const apiTarget = process.env['API_URL'] ?? 'http://localhost:8080';
for (const path of ['/api', '/media']) {
  app.use(
    path,
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
      // Preserve the mount path - createProxyMiddleware strips it otherwise.
      pathRewrite: (requestPath) => `${path}${requestPath}`,
      xfwd: true, // the API derives the rate-limit IP hash from X-Forwarded-For
    }),
  );
}

/**
 * Serve static files from /browser.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 *
 * The rendered HTML carries content straight out of MongoDB, so it must never be reused without
 * asking us first: with no `Cache-Control` at all, browsers and CDNs apply heuristic freshness and
 * a visitor can be shown a page an editor already replaced. That breaks the publish-is-immediately-
 * live guarantee the CMS is built around — it was caught by journey 8, where a rolled-back FAQ kept
 * rendering its withdrawn text from the browser's cache. Hashed assets above stay immutable for a
 * year; only the HTML shell revalidates.
 */
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port} (API proxy → ${apiTarget})`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
