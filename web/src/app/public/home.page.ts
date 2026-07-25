import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The single scrolling page (spec §5.4). Phase 12 stacks the 18 section components here. */
@Component({
  selector: 'abc-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="min-h-screen">
      <h1 class="sr-only">Abofonsa BridgeCare</h1>
    </main>
  `,
})
export class HomePage {}
