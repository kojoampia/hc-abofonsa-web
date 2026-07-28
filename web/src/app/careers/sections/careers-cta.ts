import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { LocaleService } from '../../core/i18n/locale.service';
import { CareerTrack } from '../../core/api/site-content.model';
import { CareersContentStore, PROFESSIONAL_PORTAL, handoffUrl } from '../careers-content.store';

/**
 * The handoff (careers-plan.md §5, task 137).
 *
 * Enrolment is self-service primary (D-1), so "Create your account" is the button. The secondary
 * "Request an invitation" renders only when an editor has supplied a destination in
 * `siteSettings.professionalInvitationUrl` — presence is the switch, so it cannot be turned on
 * before the page it points at exists.
 *
 * `rel="noopener"` on an external link, and no `target="_blank"`: a candidate who is about to fill
 * in a long form is better served staying in one tab than accumulating them.
 */
@Component({
  selector: 'abc-careers-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <a
      [href]="registerUrl()"
      rel="noopener"
      class="bg-brand-gold text-brand-navy rounded px-5 py-3 font-medium inline-flex items-center min-h-11"
      [attr.data-testid]="track() ? 'apply-' + track()!.slug : 'apply-primary'"
    >
      @if (track(); as chosen) {
        @let label = splitAroundTrack('careers.applyFor' | transloco: { track: SENTINEL });
        <!-- One wrapping span, not three bare children — see splitAroundTrack below. -->
        <!-- prettier-ignore -->
        <span>{{ label.before }}<span [attr.lang]="contentLang()">{{ chosen.title }}</span>{{ label.after }}</span>
      } @else {
        {{ 'careers.apply' | transloco }}
      }
    </a>
    @if (invitationUrl(); as invitation) {
      <a
        [href]="invitation"
        rel="noopener"
        class="border border-white/40 rounded px-5 py-3 inline-flex items-center min-h-11"
        data-testid="request-invitation"
      >
        {{ 'careers.requestInvitation' | transloco }}
      </a>
    }
  `,
})
export class CareersCta {
  /** Set on a track card so the link carries that role; unset for the page-level call to action. */
  readonly track = input<CareerTrack | null>(null);

  private readonly settings = inject(SiteContentStore).settings;
  private readonly locale = inject(LocaleService);
  private readonly careers = inject(CareersContentStore);

  protected readonly contentLang = this.careers.contentLang;

  /**
   * Stands in for the track name while the sentence around it is translated, so the two can be
   * separated again afterwards. U+241F is the printable symbol for "unit separator" — it cannot
   * occur in the copy, and unlike a real control character it survives sanitisation.
   */
  protected readonly SENTINEL = '␟';

  /**
   * Splits the rendered "Apply as a {{track}}" so the track name can be marked `lang="en"` while
   * the words around it stay in the page's language (WCAG 2.2 AA 3.1.2 — see the `abcContentLang`
   * directive). Track titles come from the CMS and are seeded English-only, so on `/es/careers`
   * this button reads "Solicitar como Registered nurse"; unmarked, a screen reader pronounces those
   * last two words as Spanish, on the page's single most important control.
   *
   * Split at a sentinel rather than into a prefix and suffix, because the placeholder is not in the
   * same position in every language — German is "Als {{track}} bewerben", with the name mid-clause.
   * Splitting on a substituted marker puts the boundary wherever the translator put it.
   *
   * Fed by the `transloco` pipe rather than by `TranslocoService.translate`. The imperative call
   * returns the key itself when the bundle for that language has not loaded yet, which during
   * server-side rendering is every language but English: `/de/careers` shipped a button reading
   * "careers.applyFor". The pipe waits for the bundle and re-renders when it arrives.
   */
  protected splitAroundTrack(rendered: string): { before: string; after: string } {
    const [before, after = ''] = rendered.split(this.SENTINEL);
    return { before, after };
  }

  protected readonly registerUrl = computed(() =>
    handoffUrl(`${PROFESSIONAL_PORTAL}/register`, this.track(), this.locale.current()),
  );

  protected readonly invitationUrl = computed(() => {
    const configured = this.settings()?.professionalInvitationUrl;
    return configured ? handoffUrl(configured, this.track(), this.locale.current()) : null;
  });
}
