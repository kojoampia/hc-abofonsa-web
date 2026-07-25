import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';

/** Spec §6 #1 — present only while environment.isDemo; production builds compile it out. */
@Component({
  selector: 'abc-demo-notice-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (isDemo) {
      <div class="bg-brand-gold text-white text-center text-sm px-4 py-1.5" role="note">
        {{ 'demo.banner' | transloco }}
      </div>
    }
  `,
})
export class DemoNoticeBar {
  readonly isDemo = environment.isDemo;
}
