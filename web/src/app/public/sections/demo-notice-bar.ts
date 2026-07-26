import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';

/** Spec §6 #1 — present only while environment.isDemo; the production fileReplacement flips the
 * flag to false so the banner never renders (spec §14.2 decision #2). */
@Component({
  selector: 'abc-demo-notice-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (isDemo()) {
      <div class="bg-brand-gold text-white text-center text-sm px-4 py-1.5" role="note">
        {{ 'demo.banner' | transloco }}
      </div>
    }
  `,
})
export class DemoNoticeBar {
  readonly isDemo = signal(environment.isDemo);
}
