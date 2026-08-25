# Phase P1 — the landing page starts selling: first month free

**Task 149.** The first work on this site aimed at *converting* families rather than informing them.

---

## What was asked, and what it means

"Prominent links on the landing page for patients to sign up, pitching a free sign-up and
registration for the first month."

That phrasing has two readings and they are not close: *signing up costs nothing* (true today, and a
claim about a form) versus *the first month of care costs nothing* (a promise worth **GH₵3,000 to
GH₵8,000** per subscriber, and a claim about money). Confirmed as the second before a line was
written, because the two produce different pages and only one of them is a commitment somebody has to
honour.

## The shape

| | |
|---|---|
| `patient-offer-band.ts` | Navy band directly under the hero. Heading, pitch, terms, and the sign-up button. |
| `PATIENT_OFFER` section (V020) | The offer **copy**, localised into all four languages. |
| `siteSettings.patientPortalUrl` (V019) | The offer **destination**. |
| `site-header.ts` | The header CTA now reads "Sign up — first month free" and jumps to the band; the drawer gets the same entry. |
| `docs/patient-handoff-contract.md` | What `hc-patient` is asked to do with `locale` and `src`. |

**Copy is content and the door is configuration, and they are separate switches.** A promotion's one
certainty is that it ends, so withdrawing it must not require a release: unpublish the section and the
band disappears. If patient.abofonsa.com stops answering, clear the setting and the button disappears
while the offer still reads sensibly ("call us"). Neither half leaves a broken page.

**Localised into four languages**, unlike the careers copy, which is English-only by decision (D-5).
Applicants are in Ghana; families are in the diaspora, which is the entire reason this site has four
locales. An offer a daughter in Madrid cannot read is not an offer.

**The terms sit inside the band**, next to the claim: *"Free month applies to the first month of any
plan. The minimum three-month term and 30 days' notice shown on each plan still apply."* The pricing
cards already say "minimum three-month term · 30 days' notice", and a free first month appears to
contradict that on the same page unless the two are reconciled where the visitor is looking. Stating
it in the band means **no existing pricing copy had to be rewritten** — which matters, because that
copy is the client's and lives in their database, not in this repository.

## The path, which is not the one you would guess

Patient registration is **`/account/register`**, not `/register`. The patient application mounts its
public account screens under `account`; the professional one puts registration at the root. Assuming
symmetry would have produced a dead link that still answers **200**, because both are single-page
apps and their fallback serves the shell for any path — so no status-code check, here or in CI, would
have noticed. Written down once in `PATIENT_REGISTER_PATH`.

`hc-patient` reads **neither** `locale` nor `src`: its register component takes no query parameters at
all. The link works; the attribution does not, yet. Specified rather than assumed, in
[patient-handoff-contract.md](patient-handoff-contract.md) — the same position the careers handoff
started from.

## What the schema validator caught

The first attempt to seed the section was refused by MongoDB:

```
"reason": "value was not found in enum", "consideredValue": "PATIENT_OFFER"
```

V001 installs a `$jsonSchema` validator pinning `sections.key` to a closed set, and V011 widened it
once for the careers keys. It did exactly what it exists to do — a loud failure at insert time rather
than a document written now and found unreadable later. **V018** widens it again, numbered before the
seed because `ChangelogRunner` orders by id.

## Verified

- 175 frontend unit tests, lint, i18n parity (132 keys), `tsc` clean on the e2e sources.
- 120 backend tests with the coverage gate, spotless.
- New e2e: the band renders in all four locales with its terms, sits between the hero and the pricing,
  links to `/account/register` with both parameters, and is reachable from the header and the drawer.
- Unit tests cover both switches independently, including the two withdrawal states.

## Not done, and one of them is not a code question

- **The offer is not confirmed by anyone who can honour it.** It exists because it was asked for.
  `GO-LIVE-CHECKLIST.md` §2 now carries it as a client-owned decision: who absorbs the cost, when it
  ends, and whether billing agrees that a family leaving after the free month is still inside the
  three-month term.
- **No expiry mechanism.** A promotion with no end date is a price change wearing a different hat.
  Ending it is an editor unpublishing the section — deliberate, but manual.
- **Conversion cannot be measured on this side.** No client-side analytics, by design (spec §10.4,
  which is also why there is no consent banner), so the funnel is read from `hc-patient` — and only
  once it stores `src`.
