# Careers plan — bringing professionals to the platform

**Scope: `web.abofonsa.com` only.** This plan covers the *"come with us"* stage — everything that
happens before a healthcare professional has an account. The onboarding itself lives in
`hc-professional` at `professional.abofonsa.com` and is specified in
`hc-professional/web/professional-onboarding-workflow.md`.

The boundary between the two is the whole point of this document, so it is stated first.

---

## 1. The boundary, and why it is where it is

| | `web.abofonsa.com` (this repo) | `professional.abofonsa.com` (`hc-professional`) |
|---|---|---|
| Purpose | Convince, qualify, prepare | Register, verify, authorize |
| Audience state | Anonymous visitor | Named applicant with an account |
| Personal data | **None collected** | Identity, address, documents, licence numbers |
| Ends at | A link out, carrying no personal data | An active professional with an assigned clinical authority |

**No personal data is collected on this site — not even an email address.** That is a deliberate
architectural line, not squeamishness:

- The onboarding workflow requires *"actor, timestamp, reason, and immutable audit history"* on
  every transition, starting at account creation. A CV form here would begin the relationship
  outside that audit trail, and the applicant's first real record would have to be reconciled with
  a lead captured somewhere else.
- It would create a second store of health-professional personal data with its own retention
  clock, consent record, and obligations under Ghana's Data Protection Act, 2012 (Act 843) — for
  no gain, since the applicant has to identify themselves properly on the other side anyway.
- This site's existing enquiry intake is scoped to *families seeking care*: its rate limiting,
  24-month retention and consent copy are all written for that. Reusing it for job applications
  would quietly break all three.

The corollary is that **this site's job is to reduce `returned_for_correction`**. Steps 6 and 7 of
the onboarding workflow bounce applicants who arrive without the right documents. Every requirement
we state clearly here is a review cycle the credentialing reviewer does not have to spend.

---

## 2. Decisions

### D-1 — Enrolment policy — **RESOLVED 2026-07-28: both, self-service primary**

The primary call-to-action is **"Create your account"**, linking to
`professional.abofonsa.com/register`. A secondary **"Request an invitation"** is built into the
page but hidden behind a CMS boolean, so the policy can tighten later without a rebuild.

This unblocks the careers page immediately: `/register` already exists on the professional side, so
the only ask of that repo is that it accept three query parameters (§5). If the invitation path is
ever switched on, the request-invitation surface must be built **there**, not here, so the email
address is captured inside the audited flow.

The corollary is that **the careers page is the filter**. With self-service registration there is
nothing between a curious visitor and the credentialing reviewer's queue except the clarity of this
page. That raises the stakes on §3 items 2 and 3 — eligibility and the document list — from "nice
to state" to "the mechanism that protects reviewer time".

### D-2 — Which clinical authorities — **RESOLVED 2026-07-28: all six**

`ROLE_NURSE`, `ROLE_CARER`, `ROLE_DOCTOR`, `ROLE_PARAMEDIC`, `ROLE_PHARMACIST`, `ROLE_THERAPIST`.

Nurses and carers are certainly rosterable — every plan tier is built on them — and doctors are
advertised on the PAWPAW and MELON tiers. Paramedics, pharmacists and therapists appear nowhere in
the current service or plan content, so for those the platform is recruiting ahead of the product.

That is a legitimate choice — you cannot staff a service before you have staff — but it makes the
`openings` flag load-bearing rather than decorative (task 133). A track that is being recruited for
speculatively should say so, rather than implying a rota exists. It also keeps **CR-2** live: if a
paramedic is approved before there is a duty roster to put them on, the onboarding stalls at step
10 with an activated professional and nothing to assign. Worth confirming with `hc-professional`
that an approved professional with no roster is a state their flow tolerates.

### D-3 — What may we say about terms? **(open)**

Pay, employment vs contract, shift patterns, and travel expectations. Until these are confirmed the
page must not imply any of them. "Competitive rates" with nothing behind it is worse than silence —
it is the kind of claim that gets quoted back during a dispute.

### D-4 — What is the credential-review turnaround? **(open)**

Step 7 has no SLA. Do not publish "hear back within X days" until someone owns that number. State
the *stages* instead, which is honest and still reassuring.

### D-5 — Which locales? **(open)**

The site serves four (en/es/fr/de) because *families* are in the diaspora. Applicants are in Ghana.
English is certainly required; the rest may be noise. The i18n key-parity CI check means UI strings
must exist in all four regardless, but **CMS content can be English-only and fall back** — the
resolver already does this. Recommendation: publish English, leave the others to fall back, revisit
if Francophone West Africa becomes a recruiting ground.

### D-6 — Indexing **(open)**

`SITE_INDEXABLE=false` today. Careers pages are the strongest organic-search asset this site will
have ("home care nursing jobs Accra"), and they are worthless while excluded. This does not change
the flag — it is an argument for flipping it at launch, tracked in `GO-LIVE-CHECKLIST.md`.

---

## 3. What a professional needs to see

Ordered by what actually decides someone, not by what is easiest to write.

1. **Is this real work, or gig-work with a logo?** Named supervision, countersigned notes,
   scheduled rosters, telemetry. The platform's own differentiator — *coordinated, not
   improvised* — is as much a recruitment argument as a sales one.
2. **Would I be any good at it, and am I eligible?** Track, licence, experience. Stated plainly
   enough that an unqualified applicant self-selects out before consuming a review cycle.
3. **What will you ask me for?** The step-6 document list, verbatim: certificate, licence,
   passport or Ghana Card, photograph. Applicants who arrive with these do not get returned.
4. **What happens after I apply, and how will I know?** The status model, in plain language.
   `returned_for_correction` is a real state and it is not a rejection — saying so prevents the
   silence that loses candidates.
5. **Who would I be working with?** Real clinicians, not stock photography. Blocked on the same
   consent evidence the testimonials need (`GO-LIVE-CHECKLIST.md` §2) — same rule applies: no
   named person without recorded consent.
6. **How do I start?** One CTA, repeated, going to exactly one place.

---

## 4. Content model — three small additions, no new page builder

Risk R-4 ("the CMS grows into a page builder") is real and this is where it would start. The
additions are deliberately the smallest set that carries the content above.

| Addition | Kind | Why not something bigger |
|---|---|---|
| `CAREER_TRACK` content type | New | One per recruited role. Fields: `slug`, `title`, `blurb`, `requirements[]`, `documents[]`, `authorityRole` (maps to the workflow's `ROLE_*`), `openings` (boolean), `displayOrder`. |
| `careersHero`, `careersLife`, `careersProcess`, `careersCta` | New **section keys**, existing `SECTION` type | Reuses the machinery that already renders `hero`/`approach`/`cta`. No schema change, no new editor. |
| `CAREERS` FAQ category | New enum value on the existing `FAQ` type | Careers questions are FAQs. A parallel FAQ type would be duplication. |

`authorityRole` is the load-bearing field: it is what the handoff link carries, so the track a
candidate chose here is known on the other side without them re-picking it.

**Not added:** job postings with dates, locations, application tracking, CV storage. Those belong
in `hc-professional` if they are ever needed, next to the audit trail.

---

## 5. Routes and the handoff contract

### Routes

`/careers` and `/{locale}/careers`, **lazy-loaded**. The home page's initial JavaScript budget
(220 kB gzipped, currently 153 kB) must not move — `check-bundle-size.mjs` already fails the build
if careers code reaches the initial chunk, exactly as it does for `/admin`.

A restrained entry point only: one footer link, one nav item. Careers content does **not** go on the
family-facing home page. A family evaluating care for a parent should not be reading recruitment
copy — at best it is noise, at worst it reads as *"they are short-staffed"*.

### Handoff

```
https://professional.abofonsa.com/register
  ?track=<authorityRole>     # ROLE_NURSE — the track chosen here, so it is not re-asked
  &locale=<code>             # continue in the language they were reading
  &src=web-careers           # attribution; without it nobody can tell if this page works
```

Three things must be true, and each needs confirming with `hc-professional` rather than assuming:

- **The target route exists and accepts those parameters.** Today `hc-professional`'s registration
  is the stock JHipster flow; `track`/`locale`/`src` are a request on that repo, not a given.
- **Unknown or missing parameters degrade gracefully** — a stale bookmarked link must land on a
  working registration page, not an error.
- **`src` reaches their analytics or audit**, or the attribution is decorative.

Cross-domain, so no cookie or session is shared. The link is the entire contract, which is why it
carries everything.

---

## 6. Phases

Numbered to continue `plan.md` (which ends at 127). Each phase commits on its own branch, as with
the rest of this project.

### Phase C1 — Content model and API (tasks 128–133) — **DONE**, see [docs/phase-c1-career-content-model.md](docs/phase-c1-career-content-model.md)

- **[128]** Add `CAREER_TRACK` to `ContentType`, the `CareerTrack` domain record, repository, and
  `V011SeedCareerTracks` seeding all six D-2 tracks. Nurse, carer and doctor seed with
  `openings: true`; paramedic, pharmacist and therapist seed `openings: false` until a rota exists
  for them, so the page never implies a vacancy that cannot be filled.
  *Verify*: `./mvnw verify` green; the seed is idempotent on restart.
- **[129]** Add the four `careers*` section keys via `V012SeedCareerSections`, with English copy
  and the other locales falling back (**D-5**).
  *Verify*: `GET /api/v1/content/site?locale=fr` returns the English text, never an empty string
  or a raw key.
- **[130]** Add `CAREERS` to the FAQ category enum and seed the questions from §3.
  *Verify*: existing FAQ tests still pass; the new category filters correctly.
- **[131]** ~~Extend the public payload with `careerTracks` and the new sections.~~ **Changed during
  the build:** careers content is served by its own `GET /api/v1/content/careers` instead. Folding
  it into `/content/site` would have put careers FAQs into the home page's accordion (`FaqDTO` has
  no category and the accordion renders the list unfiltered) and made every home visitor download
  content they never see. See the phase summary.
  *Verify*: a new `CareerContentResourceTest` asserts an unpublished track is absent and a
  published one carries its `authorityRole`.
- **[132]** CMS: `CAREER_TRACK` in `EDITOR_CONFIG`, reusing the existing one-editor pattern, with
  `authorityRole` as a `select` over the six workflow roles.
  *Verify*: a track can be created, translated, published and unpublished without new editor code.
- **[133]** Publishing rule: a track with `openings: false` still publishes but renders as
  "not currently recruiting" rather than disappearing — a track that vanishes looks like a broken
  site to someone who bookmarked it.
  *Verify*: integration test covers both states.

### Phase C2 — The careers page (tasks 134–139) — **DONE**, see [docs/phase-c2-careers-page.md](docs/phase-c2-careers-page.md)

- **[134]** Lazy `/careers` route with locale prefixing, matching the public shell.
  *Verify*: `--stats-json` shows careers in its own chunk; `check-bundle-size` unchanged.
- **[135]** Sections: hero, "what the work is really like", track cards, requirements and
  documents, the process explainer, CTA band. Reuses existing components wherever the shape
  matches — the track cards are the services carousel's card, not a new pattern.
- **[136]** The process explainer, rendering the status model in plain language, including
  `returned_for_correction` as *"we will ask you for one more thing"*.
  *Verify*: reviewed against `professional-onboarding-workflow.md` §Status model so the two cannot
  drift silently.
- **[137]** The handoff CTA per §5, with the `src`/`track`/`locale` parameters, plus the
  invitation-request secondary behind its CMS boolean (default off, per D-1).
  *Verify*: e2e asserts each track's CTA carries its own `authorityRole`, and that the secondary
  CTA is absent while the flag is off.
- **[138]** SEO: title, description, canonical, `JobPosting`-adjacent structured data **only if**
  D-3 settles terms — `schema.org/JobPosting` requires fields we may not be able to state
  truthfully, and inventing them to satisfy a crawler is not acceptable.
  *Verify*: structured data validates, or is absent; never partially populated.
- **[139]** Nav and footer entry points.
  *Verify*: visual baselines regenerated; the home page is otherwise unchanged.

### Phase C3 — Verification (tasks 140–143)

- **[140]** Playwright journey: land on `/careers`, read a track, follow the CTA, assert the
  outbound URL and its parameters.
- **[141]** axe-core over `/careers` in all four locales, blocking on serious/critical, as
  everywhere else.
- **[142]** Visual baselines at the three viewports.
- **[143]** i18n key parity for the new UI strings across all four bundles.

### Phase C4 — Launch (tasks 144–146)

- **[144]** Confirm the `professional.abofonsa.com` target route accepts the parameters and
  degrades gracefully. **Cross-repo — coordinate, do not assume.**
- **[145]** Attribution reaches a dashboard someone reads.
- **[146]** Decide indexing (**D-6**) and, if enabling, submit the careers URLs.

---

## 7. Risks

| ID | Risk | Mitigation |
|---|---|---|
| **CR-1** | Recruitment copy on a care-buying site reads as *"they are short-staffed"* | Separate route; no careers content on the home page; one restrained nav/footer entry |
| **CR-2** | We advertise a track the platform cannot roster (workflow step 10) | D-2 gates which tracks publish; `openings: false` for the rest |
| **CR-3** | Requirements drift from what step 6 actually enforces, so applicants arrive unprepared and bounce | Documents list cites the workflow doc; Phase C1 seeds from it; task 136 pins the status model |
| **CR-4** | Terms implied without being agreed (D-3) | Publish nothing about pay or employment until confirmed; review copy against D-3 before launch |
| **CR-5** | The handoff link rots as `hc-professional` evolves | Task 144 confirms it; the e2e journey asserts the shape, and will fail loudly if the contract changes |
| **CR-6** | Real clinicians named or pictured without consent | Same rule as testimonials — no named person without recorded consent evidence |
| **CR-7** | Careers content is invisible because the site is `noindex` | D-6 raised explicitly and tracked on the go-live checklist |

---

## 8. How we will know it worked

The funnel spans two systems, so it can only be measured if the handoff carries attribution:

| Stage | Where | Measure |
|---|---|---|
| Reached the page | this site | `/careers` sessions per locale |
| Chose a track | this site | CTA clicks by `authorityRole` — tells us which tracks attract |
| Started an account | `hc-professional` | registrations with `src=web-careers` |
| Completed the profile | `hc-professional` | `profile_completed` |
| Approved | `hc-professional` | `approved` |

**The number that matters is `returned_for_correction` as a share of applications.** If this page is
doing its job — stating requirements and documents clearly — that share falls. If it stays flat,
the copy is decorative and should be rewritten rather than merely admired.

---

## 9. Open with `hc-professional`

D-1 and D-2 are settled, so the remaining asks on that repo are narrower:

1. **Does `/register` accept `track`, `locale` and `src`, and degrade gracefully when they are
   absent or unrecognised?** The only hard dependency; a stale bookmarked link must still land on a
   working registration page.
2. **Where does `src` surface for measurement?** Without it the funnel in §8 cannot be joined and
   the attribution is decorative.
3. **Does the flow tolerate an approved professional with no duty roster?** Now that paramedics,
   pharmacists and therapists are advertised ahead of their rotas, step 10 can be reached with
   nothing to assign.
4. Deferred until the invitation path is switched on: a `request-invitation` surface.
