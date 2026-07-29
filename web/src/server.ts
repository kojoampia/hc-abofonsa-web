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
 * robots.txt, generated rather than shipped as a static file, because its content depends on the
 * deployment rather than on the build: the same image serves a review host and the real site.
 *
 * Defaults to disallowing everything. See core/seo/indexable.ts for why that direction — briefly,
 * a launch that forgets to opt in is invisible for a few days, whereas a review host that forgets
 * to opt out ends up in the index competing with the real site, which is slow and only partly
 * reversible. `/admin` stays disallowed either way; the CMS is staff-only and has nothing to gain
 * from being crawled.
 */
app.get('/robots.txt', (_req, res) => {
  const indexable = process.env['SITE_INDEXABLE'] === 'true';
  res.type('text/plain').send(
    indexable
      ? `User-agent: *\nDisallow: /admin\nSitemap: ${originOf(res.req)}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n',
  );
});

/** The public routes, in the shape the sitemap needs. Keep in step with `app.routes.ts`. */
const PUBLIC_PATHS = ['', 'careers'];
const SITEMAP_LOCALES = ['en', 'es', 'fr', 'de'];

/** Origin as the visitor sees it — behind nginx that is the forwarded host, not the socket. */
function originOf(req: import('express').Request): string {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0];
  const host = req.headers['host'] ?? 'web.abofonsa.com';
  return `${forwardedProto ?? req.protocol ?? 'https'}://${host}`;
}

function urlFor(origin: string, locale: string, path: string): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  // `/es` and `/es/careers`, but `/` for English home — matching what the router actually serves,
  // because a sitemap entry that redirects is a sitemap entry that wastes crawl budget.
  return path ? `${origin}${prefix}/${path}` : `${origin}${prefix || '/'}`;
}

/**
 * sitemap.xml (careers-plan.md task 146 — "submit the careers URLs").
 *
 * Generated, and gated on the same flag as robots.txt. Serving a sitemap while `robots.txt` says
 * `Disallow: /` would be the site contradicting itself: one file inviting a crawler to a list of
 * URLs the other forbids it to fetch. Off means genuinely off, so this 404s.
 *
 * Every URL carries `xhtml:link` alternates for all four locales, which is what tells a search
 * engine these are translations of one page rather than four thin duplicates competing with each
 * other. Each locale's own URL is included in its alternate set, as the spec requires.
 */
app.get('/sitemap.xml', (req, res) => {
  if (process.env['SITE_INDEXABLE'] !== 'true') {
    res.status(404).type('text/plain').send('Not found\n');
    return;
  }

  const origin = originOf(req);
  const entries = PUBLIC_PATHS.flatMap((path) =>
    SITEMAP_LOCALES.map((locale) => {
      const alternates = SITEMAP_LOCALES.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${urlFor(origin, alt, path)}"/>`,
      ).join('\n');
      return [
        '  <url>',
        `    <loc>${urlFor(origin, locale, path)}</loc>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(origin, 'en', path)}"/>`,
        '  </url>',
      ].join('\n');
    }),
  );

  res
    .type('application/xml')
    .send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...entries,
        '</urlset>',
        '',
      ].join('\n'),
    );
});

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
