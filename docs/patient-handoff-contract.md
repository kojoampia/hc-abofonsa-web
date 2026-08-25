# The patient handoff contract

**What `web.abofonsa.com` sends to `patient.abofonsa.com`, and what the receiving side has to do with
it.** Written for whoever owns `hc-patient`. The sibling document for the clinician side is
[careers-handoff-contract.md](careers-handoff-contract.md), and the pattern is deliberately the same.

**Status: the link works, the parameters do not.** `/account/register` serves, and a family pressing
the landing page's "Create your account" arrives at a working registration form today. Both query
parameters below are currently **dropped on the floor** — `register.component.ts` reads no query
string at all. Nothing breaks; the attribution simply does not exist yet.

---

## The link

```
https://patient.abofonsa.com/account/register?locale=fr&src=web-home
```

| Parameter | Value | Why it is there |
|---|---|---|
| `locale` | `en`, `es`, `fr` or `de` | The language they were reading. A family that reads the offer in French and lands in English has been handed a form in a language they did not choose. |
| `src` | `web-home` today | Which surface sent them. Without it nobody can say whether the offer converts — and an offer nobody can measure is an offer nobody can end. |

**Two parameters, not three.** There is no `track` equivalent: pressing this button says "I want care",
not "I want the PAWPAW plan". A defaulted plan arriving in a care record would be a fact nobody stated.

**No personal data is in this link, and none may ever be added.** This site collects nothing about a
patient — not a name, not an email. Identification begins on your side, after the family has chosen to
start.

---

## What the receiving side is asked to do

### 1. Read `locale` and start the form in that language

`register.component.ts` takes no `ActivatedRoute` and reads no query parameters. The site sends four
locales; this side should honour the ones it supports and ignore the rest.

**Degrade gracefully.** An unknown, misspelled or absent `locale` must land on a working registration
form in the default language — never an error. People bookmark and share these links with the query
string mangled.

### 2. Persist `src` where it can be counted

The equivalent on the professional side is a `source` column on the application record, surfaced in
the review queue. Anything that survives to a place a human reads is enough. Without it, the funnel
below cannot be joined and the attribution is decorative.

### 3. Tell us if `/account/register` moves

The path is the contract. It is `/account/register` because the patient app mounts its public account
screens under `account`, where the professional app puts registration at the root — this side is
already the exception, and the site has that path written down in one place
(`PATIENT_REGISTER_PATH` in `core/api/professional-handoff.ts`) so a move is a one-line change here.

**A moved route will not announce itself.** The app is a single-page application, so a wrong path
still answers `200` and still serves the shell. Every automated check this side can run would stay
green while the button led nowhere useful.

---

## The offer, which is this side's business but your side's experience

The landing page currently pitches **the first month free**. A family pressing that button expects the
form they land on to be consistent with what they were just promised. Nothing in this contract asks
`hc-patient` to know about the offer — but if registration or onboarding states pricing anywhere, the
two need to agree, and this side can change its copy without telling anyone.

---

## How we will know it worked

| Stage | Where | Measure |
|---|---|---|
| Saw the offer | this site | `/` sessions — not currently measured; there is no client-side analytics here, by design |
| Pressed the button | this site | not measurable here, for the same reason |
| Started an account | `hc-patient` | registrations with `src=web-home` |
| Completed onboarding | `hc-patient` | — |
| First visit scheduled | `hc-patient` | the number that actually matters |

As with careers, the funnel is read from the far end. That is a consequence of this site having no
analytics and no consent banner, which is a deliberate trade rather than an oversight.

---

## Verifying a change against this

From `hc-abofonsa-web`, with the local stack up:

```bash
cd web && npx playwright test e2e/careers.spec.ts -g "first-month-free"
```

Those assertions check this side's half — the origin, the path, and both parameters. They cannot
check yours; that is what items 1 and 2 are for.
