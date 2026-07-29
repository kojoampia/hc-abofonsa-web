# Phase C4 — checking the far side, switching the buttons off, and deciding not to index

**Tasks 144–146 of [`careers-plan.md`](../careers-plan.md). Phase complete.**

Branch `phase-c4-handoff-verification`.

All green: 111 backend tests with the coverage gate, 165 frontend unit, 70 e2e, lint, i18n parity.

Task 144 said "**coordinate, do not assume**". Coordinating produced a negative answer, and acting on
it turned up three defects on this side that had nothing to do with the far side.

---

## Correction, added after the fact

**Everything below about `hc-professional` was true when written and is now out of date.** It was
verified against `web@424a11f`, `api@25300a0`; that side has since implemented the contract at
`web@2b46297`, `api@fba5b5c` — `/register` captures all three parameters, the wizard pre-selects the
track, and `source` is persisted and shown as a column in the review queue. **Task 145 is not
blocked; it is done on the receiving side.** Only the Spanish question (contract item 2) is open.

The lesson worth keeping is the process one: this phase's finding was a snapshot of another team's
repository, and I later restated it as current fact without re-checking. Cross-repo findings expire.
The status table in [careers-handoff-contract.md](careers-handoff-contract.md) is the maintained one;
this document records what was found on the day.

---

## The answer to task 144 (as of `api@25300a0`, since superseded)

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

All three are fixed for a freshly seeded database — and that is not the same as fixed. V002 has
already run in production and never runs again, so the live settings document kept its missing
`version`. Checked before deploying: 1 of 1 `siteSettings` documents lacked it, against 0 of 43
across the other six collections. **V015 backfills it.** Without that, the deploy would have looked
like a success — the buttons are *supposed* to be hidden right now — and the switch would have been
welded off until the day someone first tried to turn it on.

A test now saves settings through the admin API, publishes, and reads the
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

## Task 146 — decided: indexing stays off

`SITE_INDEXABLE` remains `false`, and no URLs were submitted. The careers pages are the strongest
organic-search asset this site will have, so this is not a permanent position — but indexing a
recruitment page whose apply buttons are hidden (task 144) puts a listing in front of applicants who
cannot act on it, and teaches the crawler the page is thin. Revisit when the portal serves.

Two things were fixed first, because both made the flip unsafe and both were invisible while
`robots.txt` disallowed everything:

- **Unknown URLs answered `200`** with the not-found page. A soft 404: no visitor notices, a crawler
  indexes every typo, stale link and probe as a real page. Now `404`, set through `RESPONSE_INIT` in
  the component — only the router knows a path matched nothing, so deciding this in `server.ts`
  would mean a second copy of the route table, and the copy that drifted would be the one choosing
  status codes.
- **There was no `sitemap.xml`.** There is now, covering both public paths across four locales with
  `xhtml:link` alternates and `x-default`, gated on the same flag. Off means off: it `404`s while
  excluded, and `robots.txt` only names it when indexing is on.

The flip is now a one-line `.env` change with no rebuild, and `GO-LIVE-CHECKLIST.md` carries the
condition attached to it.

---

## Still open

- **Task 145 is done** on the receiving side — see the correction at the top. What remains here are
  §8's first two rows (`/careers` sessions per locale, CTA clicks by role), which need a privacy
  decision this site was built to avoid: §10.4 leans on "no analytics or marketing cookies are set
  anywhere on the site" to justify having no consent banner.
- **Task 146** is D-6, indexing. The two things that made flipping it unsafe are now fixed: unknown
  URLs answer 404 instead of 200, and a gated `sitemap.xml` exists. The decision itself is still
  open, and should stay off at least until the portal is deployed — a careers page indexed while its
  apply buttons are hidden is worse than not indexed.
- **The `es` question** needs an answer from the portal side before careers can honestly keep
  offering Spanish to applicants.
- **Soft 404s**: unknown routes return HTTP 200 with the not-found page. Harmless while
  `robots.txt` disallows everything, a real problem the moment D-6 flips.
- **Deployment of `hc-professional`** is not planned in any repo I can see — no build or deploy
  scripts, and a Consul dependency both Spring services refuse to start without.
