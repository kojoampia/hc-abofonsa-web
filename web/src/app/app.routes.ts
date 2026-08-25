import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { NotFoundPage } from './public/not-found.page';
import { HomePage } from './public/home.page';
import { PrivacyPage } from './public/privacy.page';
import { DeleteAccountPage } from './public/delete-account.page';
import { PublicShell } from './public/public-shell';
import { adminShellGuard } from './core/auth/admin-shell.guard';
import { isSupportedLocale, DEFAULT_LOCALE } from './core/i18n/locales';

/**
 * Matches a leading non-English locale segment (`/es`, `/fr`, `/de` — spec §5.4) so each
 * language is independently crawlable and shareable. Only the supported codes match; anything
 * else falls through to the 404 route.
 */
export function localeRouteMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  const first = segments[0]?.path;
  if (first && first !== DEFAULT_LOCALE && isSupportedLocale(first)) {
    return { consumed: [segments[0]], posParams: { locale: segments[0] } };
  }
  return null;
}

/**
 * The routes inside the public shell, shared by `/` and `/{locale}` so the two cannot drift.
 *
 * `/careers` is lazily loaded: it is a secondary audience (careers-plan.md §5) and its content,
 * components and store must not reach the initial bundle that a family visiting the home page
 * downloads. `check-bundle-size.mjs` fails the build if they do.
 */
function publicChildren(): Routes {
  return [
    { path: '', component: HomePage, data: { section: 'home' } },
    {
      path: 'careers',
      loadComponent: () => import('./careers/careers.page').then((m) => m.CareersPage),
    },
    /*
     * Both eagerly imported, unlike `careers`. They are small, and more to the point they must
     * render on a bad day: Google Play fetches `/privacy` during app review and follows
     * `/delete-account` from the store listing, so a failed lazy chunk here is a rejected app
     * rather than a slow page. `check-bundle-size.mjs` is the thing to watch if they grow.
     */
    { path: 'privacy', component: PrivacyPage },
    { path: 'delete-account', component: DeleteAccountPage },
  ];
}

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    canMatch: [adminShellGuard],
  },
  {
    matcher: localeRouteMatcher,
    component: PublicShell,
    children: publicChildren(),
  },
  {
    path: '',
    component: PublicShell,
    children: publicChildren(),
  },
  { path: '**', component: NotFoundPage },
];
