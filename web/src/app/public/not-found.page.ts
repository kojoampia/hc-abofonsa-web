import { ChangeDetectionStrategy, Component } from '@angular/core';
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
export class NotFoundPage {}
