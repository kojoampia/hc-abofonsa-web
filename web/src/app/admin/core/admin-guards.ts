import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

/** Unauthenticated visits to any CMS screen land on the login page. */
export const adminAuthGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  return auth.isAuthenticated() ? true : inject(Router).parseUrl('/admin/login');
};

/** ADMIN-only screens (users, audit — spec §9.2): blocked by the guard itself, not merely hidden
 * from the nav (task 90's verification). */
export const adminRoleGuard =
  (role: string): CanActivateFn =>
  () => {
    const auth = inject(AdminAuthService);
    if (!auth.isAuthenticated()) {
      return inject(Router).parseUrl('/admin/login');
    }
    return auth.hasRole(role) ? true : inject(Router).parseUrl('/admin');
  };

/** E-4: components exposing hasUnsavedChanges() get a confirmation before navigating away. */
export interface UnsavedChangesAware {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<UnsavedChangesAware> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return typeof confirm === 'function' ? confirm('You have unsaved changes. Leave without saving?') : true;
};
