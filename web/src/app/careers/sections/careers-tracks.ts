import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CareersContentStore } from '../careers-content.store';
import { CareersCta } from './careers-cta';

/**
 * The track cards — §3 items 2 and 3, and with self-service enrolment (D-1) the page's real work.
 * Nothing stands between a curious visitor and the credentialing reviewer's queue except how
 * clearly these state eligibility and the document list, so both are shown in full on the card
 * rather than hidden behind a link.
 *
 * A track with no rota yet is labelled rather than hidden (task 133): it keeps a bookmarked link
 * working and is honest about where the service is.
 */
@Component({
  selector: 'abc-careers-tracks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, CareersCta],
  template: `
    <section id="tracks" class="py-16 bg-brand-cream" aria-labelledby="careers-tracks-heading">
      <div class="max-w-6xl mx-auto px-4">
        <h2 id="careers-tracks-heading" class="font-serif text-3xl text-brand-navy mb-8">
          {{ 'careers.tracksHeading' | transloco }}
        </h2>
        <div class="grid lg:grid-cols-2 gap-6">
          @for (track of store.tracks(); track track.id) {
            <article
              class="bg-brand-surface rounded-card shadow-card p-8 prose-reset flex flex-col gap-4"
              [attr.data-track]="track.authorityRole"
              [attr.data-testid]="'track-' + track.slug"
            >
              <div class="flex items-start gap-3 flex-wrap">
                <h3 class="font-serif text-2xl text-brand-navy flex-1">{{ track.title }}</h3>
                @if (track.openings) {
                  <span class="text-xs font-bold uppercase tracking-wide bg-brand-ok text-white rounded px-2 py-1"
                    data-testid="badge-recruiting">
                    {{ 'careers.recruiting' | transloco }}
                  </span>
                } @else {
                  <span class="text-xs font-bold uppercase tracking-wide bg-brand-cream text-brand-navy border border-brand-line rounded px-2 py-1"
                    data-testid="badge-building">
                    {{ 'careers.building' | transloco }}
                  </span>
                }
              </div>

              <p class="text-brand-body leading-relaxed">{{ track.blurb }}</p>

              @if (!track.openings) {
                <p class="text-sm text-brand-muted italic">{{ 'careers.buildingNote' | transloco }}</p>
              }

              @if (track.requirements.length) {
                <div>
                  <b class="text-brand-navy text-sm block mb-2">{{ 'careers.requirements' | transloco }}</b>
                  <ul class="grid gap-1 text-sm text-brand-body list-none p-0">
                    @for (requirement of track.requirements; track requirement) {
                      <li class="flex gap-2">
                        <span class="text-brand-gold-ink" aria-hidden="true">✓</span>{{ requirement }}
                      </li>
                    }
                  </ul>
                </div>
              }

              @if (track.documents.length) {
                <div>
                  <b class="text-brand-navy text-sm block mb-2">{{ 'careers.documents' | transloco }}</b>
                  <ul class="grid gap-1 text-sm text-brand-body list-none p-0">
                    @for (document of track.documents; track document) {
                      <li class="flex gap-2">
                        <span class="text-brand-muted" aria-hidden="true">•</span>{{ document }}
                      </li>
                    }
                  </ul>
                  <p class="text-xs text-brand-muted mt-2">{{ 'careers.documentsNote' | transloco }}</p>
                </div>
              }

              <div class="flex flex-wrap gap-3 mt-auto pt-2">
                <abc-careers-cta [track]="track" />
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class CareersTracks {
  protected readonly store = inject(CareersContentStore);
}
