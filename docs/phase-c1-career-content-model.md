# Phase C1 — career content model and API

**Tasks 128–133 of [`careers-plan.md`](../careers-plan.md). Backend and CMS only — no public page
yet; that is Phase C2.**

Branch `phase-c1-career-content`. All green: 99 backend tests with the JaCoCo gate met, 155
frontend unit tests, 37 e2e, lint, i18n parity (111 keys), bundle budget unchanged at 66.3 kB of
headroom.

---

## What was built

| Task | Delivered |
|---|---|
| 128 | `CAREER_TRACK` content type, `CareerTrack` domain record, `AuthorityRole` enum, repository, and `V012SeedCareerTracks` seeding all six D-2 tracks |
| 129 | Four `CAREERS_*` section keys and `V013SeedCareerSections` |
| 130 | `CAREERS` FAQ category and `V014SeedCareerFaqs` (six questions) |
| 131 | `GET /api/v1/content/careers`, `CareersContentDTO`, mapper, and `CareerContentResourceTest` |
| 132 | `career-tracks` in the CMS — editor fields, nav entry, admin API path |
| 133 | `openings` semantics: a track without a rota is served and flagged, never hidden |
| — | `V011CareerCollectionsAndIndexes`, which the work turned out to require (below) |

Six tracks seeded: `registered-nurse`, `care-assistant`, `visiting-physician` with
`openings: true`; `paramedic`, `pharmacist`, `therapist` with `openings: false`.

---

## Three decisions taken during the build

### 1. The careers payload is a separate endpoint, not part of `/content/site`

`careers-plan.md` §4 sketched adding `careerTracks` to the existing aggregate payload. Building it
showed that would have been wrong, for a reason the plan did not anticipate:

**`FaqDTO` carries no category, and the home page renders `store.faqs()` unfiltered.** Careers
questions in that list would have appeared in the family FAQ accordion on the home page. Not a
styling nuisance — visitors evaluating care for a parent would have been reading "Do I need to be
registered to apply?".

The second reason is cheaper but still real: every home-page visitor would download careers content
they never see, which undoes the point of making `/careers` a lazy route in Phase C2.

So `/api/v1/content/site` keeps its exact existing meaning — the home page's content — and
`/api/v1/content/careers` serves the careers page. The existing payload's shape is unchanged, which
is why `ContentResourceTest` needed no edits at all: a good signal that nothing else moved.

`siteSettings` is deliberately **not** repeated in the careers payload. The careers page renders
inside the same shell, which already has it; duplicating it would give one page two sources for the
same phone number.

### 2. Section keys are camelCased into the payload

`SectionKey.CAREERS_HERO` would have serialised as `careers_hero` — the only snake_case identifier
in a payload that is camelCase throughout. `SiteContentService.sectionKeyOf` converts, leaving the
existing single-word keys (`hero`, `cta`) untouched. The alternative was naming the enum constants
awkwardly to make a naive `toLowerCase()` work, which trades a readable enum for a readable payload
and gets neither.

### 3. Careers content is seeded English-only

Per D-5 (still open, but this is the recommendation). `SeedText.en()` was added alongside the
existing four-locale `lt()`. Machine-translating recruitment copy into three languages nobody has
asked for would be inventing content — and worse, it would *look* reviewed. `LocalizedText.resolve`
already falls back to English, verified for all three other locales.

---

## What the database refused, and why that was the right answer

The first attempt to seed a careers section failed:

```
Document failed validation ... "operatorName": "enum",
"specifiedAs": { "enum": ["CTA","APPROACH","PROCESS","HERO","ANGEL","ASSURANCE","STATS"] },
"reason": "value was not found in enum", "consideredValue": "CAREERS_HERO"
```

`V001CreateCollectionsAndIndexes` installs MongoDB `$jsonSchema` validators pinning
`sections.key` and `faqs.category` to closed enumerations. It caught a schema change that had not
been made, at write time, with the offending value named — rather than quietly storing a document
the application would later fail to read.

`V011CareerCollectionsAndIndexes` widens both enumerations by `collMod` and creates `careerTracks`
with its own validator and indexes. It is numbered V011 so it runs before the three seeds
(`ChangelogRunner` orders by id), which is why the seeds are V012–V014 rather than V011–V013.

The `careerTracks` validator pins `authorityRole` to the six `ROLE_*` values. That is a **shared
contract with `hc-professional`**, not a local detail: the value travels in the `track` parameter
of the handoff link, so a value outside the set would produce a link that repo cannot interpret.
The constraint is stated in three places — the enum, the CMS `select`, and the database validator —
because the failure mode is silent.

---

## Tests that changed, and why

Three existing tests failed after seeding. All three were correct to fail; none was a defect.

- **`sevenFaqsSeeded`** → `sevenFamilyFaqsAndSixCareersFaqsSeeded`. Now asserts the two categories
  separately, which is stronger: a careers question appearing among the family FAQs is exactly the
  bug the payload split prevents.
- **`sevenSectionsSeededOnePerKey`** → `oneSectionPerKeyAcrossBothPages`, 11 sections, still one per
  key.
- **`coverageReportsTheMissingFrenchKeysExactly`** — Spanish content completeness fell from ~1.0 to
  **0.63**, because the careers content genuinely is untranslated. The metric is reporting a real
  gap, correctly.

That last one deserves attention rather than a threshold bump, so the assertion now checks the
metric still *discriminates* (strictly between 0 and 1) rather than pinning a number that would
move every time content is added in one locale. The comment says plainly not to "fix" it by
machine-translating recruitment copy.

**Open question it raises:** a permanently-63% completeness figure trains editors to ignore the
number. If D-5 settles on English-only for careers, the report should probably distinguish per
content type — "family content 100%, careers 0% by design" — rather than blending them into one
uninformative average. Not done here; it is a change to the i18n report, not to the content model,
and it should follow the D-5 decision rather than pre-empt it.

---

## Verified

- Clean-database bring-up: all four careers sections under camelCase keys, six tracks with their
  authority roles and openings flags, six careers FAQs.
- Home payload unchanged: 7 sections, 7 FAQs, no careers keys.
- Fallback: `?locale=fr` returns English track titles, not blanks.
- CMS round trip: list, read, edit `openings`, publish — and the public payload reflects it, so
  cache eviction works for the new type.
- A CMS-created track is `DRAFT` and absent from the public payload until published.

---

## Not in this phase

The public `/careers` page (Phase C2, tasks 134–139) and its verification (C3, 140–143). Nothing
renders this content yet — it is reachable only through the API and the CMS.

`hc-professional` still needs to confirm it accepts `track`, `locale` and `src` on `/register`, and
whether an approved professional with no duty roster is a state its flow tolerates — now live,
since three tracks are advertised ahead of their rotas.
