import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { SiteContentStore } from '../../core/api/site-content.store';
import { LocaleService } from '../../core/i18n/locale.service';
import { registerUrlFor } from '../../core/api/professional-handoff';

/**
 * The home page's route in for clinicians (task 147).
 *
 * **This reverses careers-plan.md §5 and CR-1 deliberately, on the owner's instruction.** That
 * decision kept recruitment off the family-facing page on the argument that a family evaluating care
 * for a parent reads it as *"they are short-staffed"*, and it is still a real risk — so the band is
 * placed after the closing call to action, where the care argument has already been made, and its
 * copy is addressed to clinicians rather than about staffing levels.
 *
 * Two links, because they answer two different people. Someone who already knows they want this gets
 * "Create your account" and goes straight to the portal; someone who does not gets `/careers`, which
 * is where the eligibility, requirements and document lists live. That page is the filter that keeps
 * unprepared applications out of the credentialing queue (careers-plan.md §1), so the direct link
 * carries the preparation line with it rather than skipping the point of the page.
 *
 * Copy comes from the translation bundles rather than the CMS, unlike every other home section. The
 * home page serves four locales and careers CMS content is seeded English-only (D-5), so a section
 * key here would render English prose inside `<html lang="es">` on the *home* page — the WCAG 3.1.2
 * problem the careers page has to mark its way around. UI strings have parity enforced in CI, so
 * these do not.
 *
 * `src=web-home`, not `web-careers`: the two are separate arguments and only the far end can say
 * which one converts (careers-plan.md §8).
 */
@Component({
  selector: 'abc-professional-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, RouterLink],
  template: `
    <section
      id="professionals"
      class="bg-brand-cream border-y-4 border-brand-gold py-14"
      aria-labelledby="professionals-heading"
      data-testid="home-professional-cta"
    >
      <div class="max-w-6xl mx-auto px-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div class="prose-reset flex flex-col gap-3">
          <span class="text-brand-gold-ink text-sm tracking-wide uppercase">{{ 'careers.homeEyebrow' | transloco }}</span>
          <h2 id="professionals-heading" class="font-serif text-3xl text-brand-navy">
            {{ 'careers.homeHeading' | transloco }}
          </h2>
          <p class="max-w-prose">{{ 'careers.homeBody' | transloco }}</p>
          <!-- Smaller, but not greyer. text-brand-muted is 4.43:1 on cream — under AA for 14px
               text, which is not "large" until 18.66px bold. The body colour is 7.17:1. -->
          <p class="max-w-prose text-sm">{{ 'careers.homePrepare' | transloco }}</p>
        </div>
        <div class="flex flex-wrap gap-3 lg:justify-end">
          @if (registerUrl(); as href) {
            <!-- Cross-domain and no target="_blank": someone about to fill in a long form is better
                 served by one tab than by an accumulating pile of them. -->
            <a
              [href]="href"
              rel="noopener"
              data-testid="home-apply"
              class="bg-brand-navy text-white rounded px-5 py-3 inline-flex items-center min-h-11 font-medium"
            >
              {{ 'careers.apply' | transloco }}
            </a>
          }
          <a
            [routerLink]="careersLink()"
            data-testid="home-careers-cta"
            class="rounded px-5 py-3 inline-flex items-center min-h-11 font-medium"
            [class]="rolesClasses()"
          >
            {{ 'careers.seeRoles' | transloco }}
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ProfessionalCta {
  private readonly settings = inject(SiteContentStore).settings;
  private readonly locale = inject(LocaleService);

  /** Locale-prefixed like every other route — `/careers` in English, `/fr/careers` in French. */
  protected readonly careersLink = computed(() => `${this.locale.pathPrefix()}/careers`);

  /**
   * Null while no portal is configured, exactly as on the careers page: the same CMS field switches
   * every apply button on the site, so there is no state where one page promises a door the other
   * withholds. No track — the home page has not asked anyone which role they hold, and guessing one
   * would put a defaulted role into the credentialing queue.
   */
  protected readonly registerUrl = computed(() =>
    registerUrlFor(this.settings()?.professionalPortalUrl, null, this.locale.current(), 'web-home'),
  );

  /**
   * The roles link is secondary next to "Create your account" and primary in its absence — with the
   * portal withdrawn it is the only thing here, and an outlined button sitting alone reads as
   * disabled.
   */
  protected readonly rolesClasses = computed(() =>
    this.registerUrl() ? 'border border-brand-navy text-brand-navy' : 'bg-brand-navy text-white',
  );
}
