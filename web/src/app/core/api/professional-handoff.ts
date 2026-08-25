import { CareerTrack } from './site-content.model';

/**
 * The origin the handoff is expected to point at — `hc-professional`, served at
 * professional.abofonsa.com, which owns registration, credentialing and every piece of personal
 * data this site refuses to collect (careers-plan.md §1).
 *
 * Not where the link comes from: that is `siteSettings.professionalPortalUrl`, so the buttons can be
 * withdrawn from the CMS the day the far side stops answering. This is the one place the expected
 * destination is written down, for tests and reviewers to compare a CMS value against.
 *
 * Lives in `core/` rather than in the careers chunk because the home page's professional
 * call-to-action builds the same link (task 147), and a shared symbol imported from
 * `app/careers/` would drag the lazily-loaded careers store into the initial bundle every family
 * visitor downloads.
 */
export const PROFESSIONAL_PORTAL = 'https://professional.abofonsa.com';

/**
 * Builds the handoff URL (careers-plan.md §5).
 *
 * The three parameters are the entire contract with `hc-professional` — there is no shared cookie
 * or session across the domains, so anything that side needs has to be in the link:
 *
 * - `track` so the role chosen here is not asked again,
 * - `locale` so the candidate continues in the language they were reading,
 * - `src` so the funnel can be joined at the far end; without it the attribution in §8 is
 *   decorative and nobody can say whether this page works.
 *
 * `src` distinguishes where the candidate started, because the home page and the careers page are
 * now two different arguments and only the far end can tell which one converts.
 */
export function handoffUrl(
  base: string,
  track: CareerTrack | null,
  locale: string,
  source = 'web-careers',
): string {
  const url = new URL(base);
  if (track) {
    url.searchParams.set('track', track.authorityRole);
  }
  url.searchParams.set('locale', locale);
  url.searchParams.set('src', source);
  return url.toString();
}

/**
 * The registration URL for a CMS-configured portal, or null when none is configured — in which case
 * no apply button renders anywhere on the site.
 *
 * One function rather than the same joining logic in two components: an editor who pastes a trailing
 * slash would otherwise get `//register` in one place and not the other, and only one of those would
 * be noticed.
 *
 * **Accepts either the portal root or the registration URL itself**, because the field is labelled
 * "Professional portal URL" and an editor pasting the page they were just looking at is not making a
 * mistake — the code was. That is not hypothetical: the value set in production on the day the
 * buttons went live was `https://professional.abofonsa.com/register`, and appending `/register` to it
 * put `/register/register` behind every apply button on the live site. The page's only conversion,
 * broken, with every test green — because every test supplies the origin.
 */
export function registerUrlFor(
  portal: string | null | undefined,
  track: CareerTrack | null,
  locale: string,
  source = 'web-careers',
): string | null {
  if (!portal) {
    return null;
  }
  const base = portal.replace(/\/+$/, '');
  return handoffUrl(/\/register$/i.test(base) ? base : `${base}/register`, track, locale, source);
}
