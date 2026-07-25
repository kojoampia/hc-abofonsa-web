import { Routes } from '@angular/router';

/** The lazy-loaded CMS (spec §9.2). Phase 14 fills in the screens; the placeholder shell keeps
 * the chunk boundary (AD-1) real from day one. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
  },
];
