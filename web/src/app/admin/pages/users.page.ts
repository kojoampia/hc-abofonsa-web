import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminAuthService } from '../core/admin-auth.service';

/**
 * Spec §9.2 /users — ADMIN-only, enforced by the route guard (task 90), not just hidden nav.
 * The spec's admin API (§7.5) defines no user-management endpoints: accounts are provisioned via
 * the seed changelog / operational tooling, so this screen documents the current session and
 * that constraint rather than pretending to manage users. Flagged as a spec gap for a future
 * change request.
 */
@Component({
  selector: 'abc-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold text-brand-navy mb-4">Users</h1>
    <div class="bg-brand-surface rounded-card shadow-card p-5 max-w-xl grid gap-3 text-sm" data-testid="users-screen">
      <p><b>Your roles:</b> {{ auth.roles().join(', ') }}</p>
      <p class="text-brand-muted">
        User accounts are provisioned operationally (seed changelog / server-side tooling) — the
        spec's admin API defines no user CRUD endpoints. Role matrix per spec §9.1: VIEWER reads,
        EDITOR drafts within their locale scope, PUBLISHER promotes and rolls back, ADMIN manages
        users and reads the audit trail.
      </p>
    </div>
  `,
})
export class UsersPage {
  protected readonly auth = inject(AdminAuthService);
}
