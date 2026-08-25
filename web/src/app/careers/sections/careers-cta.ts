import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { LocaleService } from '../../core/i18n/locale.service';
import { CareerTrack } from '../../core/api/site-content.model';
import { CareersContentStore } from '../careers-content.store';
import { registerUrlFor } from '../../core/api/professional-handoff';

/**
 * The handoff (careers-plan.md §5, task 137).
 *
 * Enrolment is self-service (D-1), so "Create your account" is the only button here.
 *
 * There was a second one. "Request an invitation" rendered whenever `professionalInvitationUrl` held
 * a value, on the reasoning that presence is a switch which cannot be flipped before the page it
 * points at exists. It could: the field was filled in with the *registration* URL, so the button
 * appeared on the live site advertising an invitation flow that has never been built, and pointed at
 * the form its neighbour already links to. Removed rather than re-gated, because D-1 settled where
 * that surface belongs if it is ever wanted — in `hc-professional`, next to the audit trail, where
 * the email address can be captured inside the audited flow rather than on a site that identifies
 * nobody.
 *
 * `rel="noopener"` on an external link, and no `target="_blank"`: a candidate who is about to fill
 * in a long form is better served staying in one tab than accumulating them.
 */
@Component({
  selector: 'abc-careers-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (registerUrl(); as href) {
    <a
      [href]="href"
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

  /**
   * The handoff link, or null while no portal is configured — in which case no apply button renders
   * at all.
   *
   * Configured as of task 147: professional.abofonsa.com serves the `hc-professional` application
   * and accepts the three parameters. The null branch stays, and is not dead code — it is how the
   * buttons were withdrawn for the whole of Phase C4 while the host answered nothing, and how they
   * would be withdrawn again from the CMS in one publish. A button that leads to a connection error
   * is worse than no button on a page that has just asked someone to gather a licence and a Ghana
   * Card before pressing it.
   */
  protected readonly registerUrl = computed(() =>
    registerUrlFor(this.settings()?.professionalPortalUrl, this.track(), this.locale.current()),
  );

}
