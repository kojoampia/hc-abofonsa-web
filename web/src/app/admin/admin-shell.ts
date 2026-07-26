import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from './core/admin-auth.service';

/**
 * The CMS shell (spec §9.2). The cyan accent (#17A9CE, spec §5.2) marks admin screens apart from
 * the public site's navy/gold — deliberately, so staff always know which surface they are on.
 */
@Component({
  selector: 'abc-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: `
    /* The CMS teal darkened until it carries text at WCAG AA: the brand tone #17a9ce gives white
     * only 2.8:1, and the old active-link ink #0d7d9c reached 4.2:1 on its own tint. Both now
     * clear 4.5:1 while staying the same hue, so the CMS still reads as the same colour. */
    .admin-accent { background: #10758e; }
    .admin-link.active { background: rgb(23 169 206 / 0.12); color: #0e6980; font-weight: 600; }
  `,
  template: `
    <div class="min-h-screen grid grid-cols-[220px_1fr]">
      <aside class="border-r border-brand-line bg-brand-surface flex flex-col">
        <div class="admin-accent text-white px-4 py-4 font-semibold">Abofonsa CMS</div>
        <nav class="flex flex-col p-2 gap-1 text-sm" aria-label="CMS navigation">
          <a class="admin-link rounded px-3 py-2" routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/content/sections" routerLinkActive="active">Sections</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/content/services" routerLinkActive="active">Services</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/content/plans" routerLinkActive="active">Plans</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/content/testimonials" routerLinkActive="active">Testimonials</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/content/faqs" routerLinkActive="active">FAQs</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/translations" routerLinkActive="active">Translations</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/media" routerLinkActive="active">Media</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/enquiries" routerLinkActive="active">Enquiries</a>
          <a class="admin-link rounded px-3 py-2" routerLink="/admin/content/settings" routerLinkActive="active">Settings</a>
          @if (auth.hasRole('ADMIN')) {
            <a class="admin-link rounded px-3 py-2" routerLink="/admin/users" routerLinkActive="active" data-testid="nav-users">Users</a>
            <a class="admin-link rounded px-3 py-2" routerLink="/admin/audit" routerLinkActive="active" data-testid="nav-audit">Audit</a>
          }
        </nav>
        <button class="mt-auto m-3 rounded border border-brand-line px-3 py-2 text-sm" (click)="auth.logout()" data-testid="logout">
          Sign out
        </button>
      </aside>
      <main class="p-6 bg-brand-cream/40 overflow-x-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminShell {
  protected readonly auth = inject(AdminAuthService);
}
