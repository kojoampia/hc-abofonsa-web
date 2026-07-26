import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public routes render on-demand on the server (spec AD-5): the page content comes from MongoDB
 * through the content API, so prerendering at build time would bake in stale content and fail
 * entirely when the API isn't reachable during the build.
 *
 * The CMS is client-rendered instead. Its authentication state lives in sessionStorage (see
 * `TokenStore` — deliberately, so tokens die with the tab), which does not exist on the server:
 * SSR would run `adminAuthGuard` against an empty store, redirect every admin URL to the login
 * page, and hand the browser that already-decided result to hydrate. There is nothing to gain
 * either — the CMS is authenticated and noindex, so neither first-paint speed nor crawlability,
 * the two reasons to server-render, apply to it.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
