import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder CMS shell — replaced by the real screens in Phase 14. Deliberately minimal so the
 * lazy chunk exists and stays out of the public bundle (task 69). */
@Component({
  selector: 'abc-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="p-8">Abofonsa CMS — coming in Phase 14.</p>`,
})
export class AdminShell {}
