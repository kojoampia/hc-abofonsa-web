# The careers handoff contract

**What `web.abofonsa.com` sends to `professional.abofonsa.com`, and what the receiving side has to do
with it.** Written for whoever owns `hc-professional`.

**Status: fully implemented on the receiving side.** First verified against `web@424a11f`,
`api@25300a0`, where none of it was accepted; then `web@2b46297`, `api@fba5b5c` (items 1, 3, 4); then
`web@0088d95`, `api@ec82f24`, which added Spanish and closed item 2.

**All four items are done, and the link is live.** `professional.abofonsa.com` now serves the
`hc-professional` application, `professionalPortalUrl` is set in this side's mini CMS, and every apply
call-to-action on `/careers` — plus a new one on the landing page — points at it (task 147).

One thing changed on *this* side that the receiving side should know about: **`src` now carries two
values.** See the table below.

That history is the point of this table. Each check was a snapshot of a repository moving
independently of this one, and each was out of date within days — twice I restated an old snapshot as
current fact. Re-verify before relying on any line here.

---

## The link

```
https://professional.abofonsa.com/register?track=ROLE_NURSE&locale=fr&src=web-careers
```

Exactly three parameters, always in that set — asserted in `e2e/journeys.spec.ts` Journey 9, which
fails if a fourth ever appears. The domains differ, so there is no shared session or cookie: this URL
is the entire agreement between the two applications.

| Parameter | Value | Why it is there |
|---|---|---|
| `track` | one of the six `AuthorityRole` names | The role the candidate chose by reading a specific card |
| `locale` | `en`, `es`, `fr` or `de` | The language they were reading in |
| `src` | `web-careers` or `web-home` | So the funnel can be joined at the far end |

`src=web-home` is new as of task 147: the landing page now carries its own "Create your account"
link, and the two surfaces are separate arguments that only the far end can tell apart. It is a
second **value**, not a fourth parameter — the set is still exactly `{track, locale, src}`, and
`e2e/journeys.spec.ts` Journey 9 still fails if that changes. **Anything on the receiving side that
matches `source == 'web-careers'` exactly will now under-count.** A candidate arriving from the home
page also carries no `track`, for the same reason the page-level call-to-action does not: nobody
asked them which role they hold, and a defaulted role reaching the credentialing queue as a stated
fact is the original defect this contract was written to fix.

`track` is omitted — not empty, absent — on the page-level call to action, where no role was chosen.

**No personal data is in this link, and none may ever be added.** careers-plan.md §6: this domain
identifies nobody. Identification begins on the far side, after the candidate has chosen to start.

---

## What the receiving side must do

### 1. Accept `track` and carry it to the onboarding wizard ✓ **done**

~~`/register` is the stock JHipster route… the parameter is dropped.~~

`core/careers/careers-handoff.service.ts` captures all three from the query string, validates them
against `Authority` and `LANGUAGES`, and stores them under `hpd-careers-handoff`. The onboarding
wizard pre-selects `requestedRole` from the captured track. **localStorage, not sessionStorage** —
the activation email opens a fresh tab, which sessionStorage would not survive. A cross-device
activation loses it and the wizard falls back to explicit choice, which is the degradation rule
below working as intended.

Role is chosen later, in the authenticated `/onboarding` wizard:

```ts
requestedRole: new FormControl<string>('ROLE_NURSE', { nonNullable: true, ... })
```

**This is the most damaging of the three, and it is not "the candidate gets asked twice."** A
visiting physician who arrives from the doctor card and does not notice the pre-selected default
submits a **nurse application with a doctor's licence attached**. Enrolment is self-service (D-1), so
nothing between the careers page and the credentialing reviewer's queue would catch it.

Registration is anonymous and onboarding is authenticated, so the value has to survive a sign-in.
Any of session storage, a short-lived cookie, or a redirect parameter carried through the auth
round-trip would do; which one is the receiving side's call.

**Accepted vocabulary.** All six values careers sends exist in `config/authority.constants.ts`:
`ROLE_NURSE`, `ROLE_CARER`, `ROLE_DOCTOR`, `ROLE_PARAMEDIC`, `ROLE_PHARMACIST`, `ROLE_THERAPIST`.
That side additionally defines `ROLE_ANGEL`, `ROLE_CHEMIST` and `ROLE_TECHNICIAN`, which careers does
not advertise — so treat the parameter as *a value from a known set*, and fall back to today's
behaviour on anything unrecognised rather than failing the page.

### 2. Honour `locale` ✓ **done**

~~`LANGUAGES` is `['en', 'fr', 'de']`… there is no Spanish.~~ Resolved by adding it, rather than by
careers withdrawing the offer.

`LANGUAGES` is now `['en', 'es', 'fr', 'de']` with 34 Spanish bundles, matching English's count and
none of them empty. The capture service validates against that list, so `es` now passes;
`register.component.ts` calls `translateService.use(...)` and stores the choice, and the account is
created with `langKey` set to the carried locale. A Spanish applicant arriving from `/es/careers`
registers in Spanish and stays there.

### 3. Store `src` somewhere a person can read ✓ **done**

`StartApplicationRequest` is now `(requestedRole, consentAccepted, source)`; `OnboardingService`
normalises it onto `ProfessionalApplication.source`; `GET /applications` returns it; and the review
queue renders it as a **column**, with the detail page showing it too. That is task 145's "dashboard
someone reads", and it exists.

The one thing to preserve: `source` is capped at 64 characters and unknown values are dropped rather
than rejected, so a malformed link never blocks an application.

### 4. Degrade gracefully with none of them ✓

This already holds: unknown query parameters are ignored and the form works. Please keep it. People
paste links with the query string stripped, and the page must not depend on the parameters existing.

---

## The gate on this side — now open

~~`professional.abofonsa.com` resolves (199.247.5.252) but nothing answers.~~ **It serves.**
`/register` returns `200` with the `hpd-app` shell, so the deployment gap that outlasted the contract
is closed, and `professionalPortalUrl` has been set in the mini CMS. All eight calls-to-action on
`/careers` are live, and so is the landing page's.

Note what a `200` there does and does not prove. The portal is a single-page application, so
`/zzz-not-a-page` answers `200` too: the check confirms the host and the SPA fallback are healthy,
not that the register route renders or that the captured parameters survive to the wizard. Click the
handoff through in a real browser once — the workspace already requires that of any deploy touching a
dashboard, and this is the one link the careers page exists to produce.

**The switch remains a CMS field, not a build value**, which is what makes the reverse direction
cheap: clearing `siteSettings.professionalPortalUrl` and publishing withdraws every apply button on
the site within one publish and with no release. If the portal goes down, that is the lever. The page
keeps all six tracks with their requirements and document lists either way — what is withheld is the
promise of a door, not the reason to walk through it.

---

## Verifying a change against this

From `hc-abofonsa-web`, with the local stack up:

```bash
npx playwright test e2e/journeys.spec.ts -g "Journey 9"   # the parameters, end to end
npx playwright test e2e/careers.spec.ts                   # the gate, both states
```

Journey 9 intercepts the outbound request rather than following it, so it verifies this side's half
without needing the portal to exist. It cannot verify yours — that is what items 1–3 are for.
