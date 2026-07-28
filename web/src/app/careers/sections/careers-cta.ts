import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteContentStore } from '../../core/api/site-content.store';
import { LocaleService } from '../../core/i18n/locale.service';
import { CareerTrack } from '../../core/api/site-content.model';
import { PROFESSIONAL_PORTAL, handoffUrl } from '../careers-content.store';

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
      @if (track(); as track) {
        {{ 'careers.applyFor' | transloco: { track: track.title } }}
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

  protected readonly registerUrl = computed(() =>
    handoffUrl(`${PROFESSIONAL_PORTAL}/register`, this.track(), this.locale.current()),
  );

  protected readonly invitationUrl = computed(() => {
    const configured = this.settings()?.professionalInvitationUrl;
    return configured ? handoffUrl(configured, this.track(), this.locale.current()) : null;
  });
}
