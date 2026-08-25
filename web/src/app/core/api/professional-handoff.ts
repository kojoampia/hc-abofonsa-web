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

/**
 * The patient portal — `hc-patient`, served at patient.abofonsa.com, which owns patient accounts,
 * care plans and everything this site refuses to hold.
 *
 * Registration lives at **`/account/register`**, not `/register`: the patient application mounts its
 * public account screens under `account`, where the professional one puts registration at the root.
 * Assuming the two were symmetrical would have produced a dead link that still answers `200`, because
 * both are single-page apps and their fallback serves the shell for any path.
 */
export const PATIENT_PORTAL = 'https://patient.abofonsa.com';
export const PATIENT_REGISTER_PATH = '/account/register';

/**
 * The patient registration URL for a CMS-configured portal, or null when none is configured — in
 * which case the landing page's offer band renders without its button.
 *
 * Carries `locale` and `src` on the same reasoning as the careers handoff: the domains differ, so
 * nothing is shared but the link. **`hc-patient` reads neither yet** — its register component takes
 * no query parameters at all — so today they are a request written into the URL rather than a working
 * contract, specified in `docs/patient-handoff-contract.md`. They cost nothing while ignored, and the
 * day that side reads them the attribution starts working with no change here.
 *
 * No `track` equivalent: a family has not chosen a plan by pressing this, and inventing one would put
 * a guess into someone's care record.
 */
export function patientRegisterUrlFor(
  portal: string | null | undefined,
  locale: string,
  source = 'web-home',
): string | null {
  if (!portal) {
    return null;
  }
  const base = portal.replace(/\/+$/, '');
  const target = base.endsWith(PATIENT_REGISTER_PATH) ? base : `${base}${PATIENT_REGISTER_PATH}`;
  const url = new URL(target);
  url.searchParams.set('locale', locale);
  url.searchParams.set('src', source);
  return url.toString();
}
