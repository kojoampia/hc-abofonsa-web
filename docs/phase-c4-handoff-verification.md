# Phase C4 — checking the far side, and switching the buttons off

**Task 144 of [`careers-plan.md`](../careers-plan.md).** Branch `phase-c4-handoff-verification`.

All green: 111 backend tests with the coverage gate, 165 frontend unit, 70 e2e, lint, i18n parity.

Task 144 said "**coordinate, do not assume**". Coordinating produced a negative answer, and acting on
it turned up three defects on this side that had nothing to do with the far side.

---

## The answer to task 144

`hc-professional` accepts **none** of the three parameters. Details, and what is required instead,
are in [careers-handoff-contract.md](careers-handoff-contract.md) — written for whoever owns those
repos, since the decision here was to specify rather than implement across them.

The headline, because it is worse than it sounds: `/register` drops `track`, and role is chosen later
in the `/onboarding` wizard, which **defaults to `ROLE_NURSE`**. So a visiting physician arriving from
the doctor card doesn't get "asked twice" — they submit a nurse application with a doctor's licence,
and with self-service enrolment (D-1) nothing between the careers page and the credentialing queue
catches it.

Two smaller findings: the portal has **no Spanish** (`LANGUAGES` is `en/fr/de`) while careers offers
it and sends `locale=es`; and `src` has nowhere to land, so task 145 has no target yet.

One piece of good news: all six roles careers sends already exist in the portal's `Authority` enum.
The vocabulary is right; nothing reads it.

---

## The buttons are off, and off from the CMS

`professional.abofonsa.com` resolves but serves nothing, and none of the three repos has build or
deploy tooling. The live site was carrying eight buttons to a dead host.

`siteSettings.professionalPortalUrl` now switches every apply call-to-action on `/careers`. Seeded
null, so they are all absent; setting it in the CMS and publishing brings them back with no deploy.

**This reverses a Phase C2 decision, deliberately.** The destination was a compiled-in constant then,
on the argument that the page's only conversion should not depend on a field somebody could mistype.
Checking reality inverted the trade: whether a host answers is not a build-time fact, and treating it
as one meant the only way to withdraw a broken button was a release. The constant survives in
`careers-content.store.ts` as the written-down expected origin for tests to compare against.

The page keeps everything else. All six tracks, requirements, document lists and badges still render,
so an applicant can still learn exactly what to prepare — what is withheld is the promise of a door.

---

## Three defects found by trying to use the switch

Gating on a CMS setting is worthless if the CMS cannot save that setting. It could not.

**1. `siteSettings` had no `version` field.** Every other content type has `@Version Long version`;
this one never did. The admin update matches on `{_id, version}`, so every settings write matched
zero documents and fell into the conflict branch. **The CMS settings screen has never been able to
save, for the entire life of the project.** Nothing noticed because no test had ever saved it — the
accessibility pass visits `/admin/translations` and the FAQ editor, and the settings screen was only
ever read.

**2. That conflict branch then 500ed.** It built its response with
`Map.of("currentVersion", current.get("version"), ...)`, and `Map.of` rejects nulls — so the missing
version produced a `NullPointerException` instead of the 409 that would have named the problem. A
diagnostic path that crashes on exactly the input it exists to describe.

**3. Revisions rejected statusless documents.** With 1 and 2 fixed the write landed and *then* threw:
`recordRawRevision` does `PublicationStatus.valueOf(status)`, and `siteSettings` is explicitly outside
the publish lifecycle so has no status — arriving as the string `"null"`. The save succeeded and the
caller got a 500, which is the worst of both.

All three are fixed, and a test now saves settings through the admin API, publishes, and reads the
result back on the public payload. It also **clears the value again**, which is both the "and off"
half of the claim and basic hygiene — my first version left the portal configured and broke the next
test, which is precisely how a career track once stayed flipped to "recruiting" and reached a visual
baseline.

---

## Also fixed

`professionalInvitationUrl` was never in the settings editor config. It was added to the API in C2
and never surfaced in the CMS, so "an editor supplies a destination" was only ever true through the
API. Both portal fields are now editable.

---

## What changed in the tests

The seeded state has no portal, so most tests now assert the buttons are **absent** — that is what
the site ships. The handoff contract still has to be verified though, so the tests that check the
parameters turn the portal on first via `withPortalConfigured`, which restores the previous value in
a `finally`.

That split is the useful part: the shipped state and the contract are now tested separately, and
neither can quietly become the other.

---

## Still open

- **Tasks 145 and 146.** 145 (attribution reaches a dashboard) is blocked on item 3 of the contract —
  there is nowhere to put `src`. 146 is D-6, indexing, which should stay off at least until the
  portal exists: a careers page indexed while its apply buttons are hidden is worse than not indexed.
- **The `es` question** needs an answer from the portal side before careers can honestly keep
  offering Spanish to applicants.
- **Soft 404s**: unknown routes return HTTP 200 with the not-found page. Harmless while
  `robots.txt` disallows everything, a real problem the moment D-6 flips.
- **Deployment of `hc-professional`** is not planned in any repo I can see — no build or deploy
  scripts, and a Consul dependency both Spring services refuse to start without.
