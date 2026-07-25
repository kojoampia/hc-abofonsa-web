import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { NotFoundPage } from './public/not-found.page';
import { HomePage } from './public/home.page';
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

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    canMatch: [adminShellGuard],
  },
  {
    matcher: localeRouteMatcher,
    component: PublicShell,
    children: [{ path: '', component: HomePage, data: { section: 'home' } }],
  },
  {
    path: '',
    component: PublicShell,
    children: [{ path: '', component: HomePage, data: { section: 'home' } }],
  },
  { path: '**', component: NotFoundPage },
];
