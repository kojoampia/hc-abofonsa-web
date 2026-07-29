import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'abc-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <main id="main" class="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 class="text-3xl font-semibold text-brand-navy">{{ 'error.notFoundTitle' | transloco }}</h1>
      <p class="text-brand-muted">{{ 'error.notFoundBody' | transloco }}</p>
      <a routerLink="/" class="text-brand-gold-ink underline">{{ 'error.returnHome' | transloco }}</a>
    </main>
  `,
})
export class NotFoundPage {
  constructor() {
    /**
     * Answer 404, not 200.
     *
     * Every unknown URL was served with HTTP 200 and this page's body — a "soft 404". Browsers do
     * not care, which is why it survived, but a crawler does: it indexes each typo, dead link and
     * probe as a real page, then treats the site as full of thin duplicate content. Harmless only
     * because `robots.txt` currently disallows everything; a blocker the moment D-6 flips
     * (careers-plan.md task 146).
     *
     * Set through the SSR response token rather than in `server.ts`, because only the router knows
     * a path matched nothing — the server would have to re-implement the route table to find out,
     * and the copy that drifted would be the one deciding status codes. Absent in the browser,
     * where there is no response to modify.
     */
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }
  }
}
