import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every route renders on-demand on the server (spec AD-5): the page content comes from MongoDB
 * through the content API, so prerendering at build time would bake in stale content and fail
 * entirely when the API isn't reachable during the build.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
