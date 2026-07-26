import { Routes } from '@angular/router';
import { adminAuthGuard, adminRoleGuard, unsavedChangesGuard } from './core/admin-guards';

/** The CMS screens (spec §9.2), all inside the lazy admin chunk. */
export const ADMIN_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
  {
    path: 'change-password',
    loadComponent: () => import('./pages/change-password.page').then((m) => m.ChangePasswordPage),
  },
  {
    path: '',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage) },
      {
        path: 'content/:type',
        loadComponent: () => import('./pages/content-list.page').then((m) => m.ContentListPage),
      },
      {
        path: 'content/:type/:id',
        loadComponent: () => import('./pages/content-editor.page').then((m) => m.ContentEditorPage),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'translations',
        loadComponent: () => import('./pages/translations.page').then((m) => m.TranslationsPage),
      },
      { path: 'media', loadComponent: () => import('./pages/media.page').then((m) => m.MediaPage) },
      { path: 'enquiries', loadComponent: () => import('./pages/enquiries.page').then((m) => m.EnquiriesPage) },
      { path: 'settings', redirectTo: 'content/settings' },
      {
        path: 'users',
        canActivate: [adminRoleGuard('ADMIN')],
        loadComponent: () => import('./pages/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'audit',
        canActivate: [adminRoleGuard('ADMIN')],
        loadComponent: () => import('./pages/audit.page').then((m) => m.AuditPage),
      },
    ],
  },
];
