# The careers handoff contract

**What `web.abofonsa.com/careers` sends to `professional.abofonsa.com`, and what the receiving side
has to do with it.** Written for whoever owns `hc-professional`; nothing here has been implemented
there.

Verified against `hc-professional` at `web@424a11f`, `api@25300a0`, `gateway@61d611c`
(careers-plan.md task 144). Everything below marked ✗ is a statement about that code, not a guess.

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
| `src` | always `web-careers` | So the funnel can be joined at the far end |

`track` is omitted — not empty, absent — on the page-level call to action, where no role was chosen.

**No personal data is in this link, and none may ever be added.** careers-plan.md §6: this domain
identifies nobody. Identification begins on the far side, after the candidate has chosen to start.

---

## What the receiving side must do

### 1. Accept `track` and carry it to the onboarding wizard ✗

`/register` is the stock JHipster route. `register.route.ts` declares no resolver, the component
injects no `ActivatedRoute`, and `Registration` is `(login, email, password, langKey)`. The parameter
is dropped.

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

### 2. Honour `locale`, or decide not to ✗

`LANGUAGES` is `['en', 'fr', 'de']` and `i18n/` holds three directories. **There is no Spanish.**

Careers offers Spanish and will send `locale=es`. Two ways out, and this is a decision, not a bug to
be fixed by default:

- Add `es` to the portal, or
- Tell us, and the careers page stops offering Spanish applicants a continuity it cannot deliver.

For `en`/`fr`/`de`, the parameter should set `langKey` on registration rather than leaving it to the
portal's own default.

### 3. Store `src` somewhere a person can read ✗

`OnboardingResource.StartApplicationRequest` is `(requestedRole, consentAccepted)`. There is no
attribution field anywhere in the onboarding API, so careers-plan.md task 145 — "attribution reaches
a dashboard someone reads" — currently has no target.

What is needed is one nullable string persisted on the application at creation, surfaced wherever
applications are reviewed or counted. Without it nobody can answer whether the careers page works,
which is the only way to know if any of the rest was worth building.

### 4. Degrade gracefully with none of them ✓

This already holds: unknown query parameters are ignored and the form works. Please keep it. People
paste links with the query string stripped, and the page must not depend on the parameters existing.

---

## What this side does meanwhile

`professional.abofonsa.com` resolves (199.247.5.252) but nothing answers, and none of the three repos
has build or deploy tooling.

**So the apply buttons are switched off, and they are switched off from the CMS, not the build.**
`siteSettings.professionalPortalUrl` is seeded null; while it is null no apply button renders
anywhere on `/careers`. The page still lists all six tracks with their requirements and document
lists, so an applicant can still learn what to prepare — what is withheld is the promise of a door.

Setting that field in the CMS and publishing turns all eight buttons on at once, with no deploy.
**Do not set it until the portal actually serves**, and preferably not until items 1–3 above are
done, because a working button into a flow that mislabels the applicant's role is worse than no
button.

---

## Verifying a change against this

From `hc-abofonsa-web`, with the local stack up:

```bash
npx playwright test e2e/journeys.spec.ts -g "Journey 9"   # the parameters, end to end
npx playwright test e2e/careers.spec.ts                   # the gate, both states
```

Journey 9 intercepts the outbound request rather than following it, so it verifies this side's half
without needing the portal to exist. It cannot verify yours — that is what items 1–3 are for.
