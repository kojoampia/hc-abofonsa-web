# Phase C3 — verifying the careers page

**Tasks 140–143 of [`careers-plan.md`](../careers-plan.md).** Branch `phase-c3-careers-verification`.

All green: 109 backend tests with the coverage gate, 165 frontend unit, 65 e2e, lint, i18n parity
(125 keys, 94 referenced).

This was a verification phase, and it behaved like one: every one of the four tasks found something.
Three product defects and one silently-wrong test.

---

## What was built

| Task | Delivered |
|---|---|
| 140 | Journey 9 — header → `/careers` → track → CTA, asserting the intercepted outbound request |
| 141 | axe-core over `/careers` in four locales, plus the expanded FAQ state |
| 142 | Baselines at three viewports, plus German at 390px, plus a CTA-overflow rule |
| 143 | A referenced-key check in `check-i18n.mjs` — 94 keys, all defined |

---

## The defect none of it was looking for

`/es/careers` served `<html lang="es">` wrapped around **English prose**, and so did `/fr` and
`/de`. Careers copy is seeded English-only by decision (D-5) — the four locales exist because
*families* are in the diaspora, whereas applicants are in Ghana — so `LocalizedText.resolve` falls
back to English on every non-English request. Falling back is correct. Serving it without saying so
is a WCAG 2.2 AA failure under **3.1.2 Language of Parts**.

The consequence is not notional. A screen reader switches voice and pronunciation rules on `lang`,
so unmarked English read as Spanish is not accented — it is unintelligible. On this page that covers
the requirements and document lists, which is the text an applicant most needs to get right.

**Task 141 could never have caught it.** axe-core checks that `lang` is present and well-formed; it
does not read the words. Deciding whether text matches its declared language means understanding the
text, so this is a permanent blind spot in the tool, not a rule someone forgot to enable.

The server now reports the language it actually served, and the client marks the difference:

```json
{ "locale": "es", "contentLanguage": "en", ... }
```

Three deliberate choices in that:

- **Not a hardcoded `lang="en"`.** The store returns `null` once the served language matches the
  page, so translating the content in the CMS removes the attributes by itself. A literal would
  leave Spanish copy labelled English the day someone writes it — the same defect inverted, with
  nothing left to prompt anyone to undo it.
- **Per element, not one wrapper.** The page interleaves the two at leaf level: in a track card
  "What we look for" is translated chrome while the requirements under it are English CMS text,
  inside the same `<article>`. A `lang` on any convenient ancestor fixes the English and breaks the
  Spanish. 65 elements are marked on `/es/careers`; the headings around them are not.
- **All-or-nothing, and stated as such.** `contentLanguage` claims the requested locale only when
  every string in the payload has a translation in it. A part-translated payload reports `en`, which
  mislabels the translated parts — the lesser error, since English voiced as Spanish is the failure
  that actually makes a page unusable. Documented on the service and pinned by a test, so it is a
  decision rather than something to rediscover.

The button needed its own treatment. "Apply as a {{track}}" puts an English fragment *inside* a
translated sentence, and the fragment does not sit at the end in every language — German is
"Als {{track}} bewerben", mid-clause. The name is substituted with a sentinel, translated, and split
at wherever the translator put it.

---

## Two more, found by looking at the baseline

Task 142's baselines are only worth having if someone looks at the first one. Two things were wrong
in it, and neither was going to fail a test.

**The call-to-action read "Apply as aRegistered nurse".** The markup was correct — the space is
right there in the DOM, and the accessible name computes with it. The anchor is `inline-flex`, and a
flex container promotes every child *including each text node* to a flex item, then discards the
whitespace between them. So splitting the label for `lang` broke the sentence. Fixed by nesting the
pieces in one span, back in normal inline flow.

**The paramedic card advertised "Recruiting now"** for a role with no rota — exactly the claim D-2
exists to prevent. Not a code defect: `updatedBy: 'admin'`, 35 seconds after the seed. Someone
(me, exercising the CMS during C1/C2) flipped the flag and left it. The existing test asserted only
that *some* card was badged "building", so it passed against the drifted data — and the baseline
would have made the drifted page the reference for every future comparison. Now asserted per role,
mirroring the backend test.

---

## The test that agreed with the bug

The first assertion written for the spacing defect passed against the broken markup. It compared
`innerText` against a regex for run-together words, and `innerText` reports flex items separated by
newlines — `"Als\nRegistered nurse\nbewerben"` contains no lowercase-uppercase adjacency, so the
regex saw nothing wrong.

That was caught by reconstructing the pre-fix DOM in a live browser and checking the assertion
against both states. It discriminates now, and for the right reason: the newline **is** the flex
promotion, so asserting the label contains no line break tests the actual defect rather than a
symptom of it. Verified in all four locales before being trusted.

```
/       fixed="Apply as a Registered nurse"      broken="Apply as a\nRegistered nurse"
/de/    fixed="Als Registered nurse bewerben"    broken="Als\nRegistered nurse\nbewerben"
```

`textContent` cannot see this at all; it reports the spaces whether or not they render.

---

## Also fixed

**A contrast failure on the "Recruiting now" badge** — task 141's first honest finding.
`--color-brand-ok` was `#2e9e63`, fine for the decorative ✓ marks it was introduced for and a
**3.39:1** failure the moment it became a fill behind white text (12px bold is not "large text", so
it owes 4.5:1). Darkened to `#277f50`: white on it is 4.96:1, and the ✓ marks improve to 4.96:1 on
white and 4.63:1 on cream. One token rather than an `-ok-deep` variant, because every use is better
for the darker value.

---

## What the checks now cover that they did not

**`check-i18n.mjs` verifies that keys the app asks for exist.** The bundle-to-bundle comparisons
cannot see a key referenced in a template and added to no bundle: Transloco renders the key itself,
so a visitor reads "careers.tracksHeading" where a heading belongs, and the page still returns 200.
Keys are matched by shape and filtered to roots present in `en.json`, which is what makes it safe
against the dynamic call sites (`{{ item.key | transloco }}`) where the literal is nowhere near the
pipe. Verified by planting a typo and watching it fail.

The inverse — defined-but-unused — is deliberately absent. Those same indirections make "unused"
unknowable without running the app, and a warning nobody can act on trains people to ignore it.

**A CTA-overflow rule at 390px in all four locales**, because a pixel baseline cannot fail for a
reason it was taught to expect, and a button whose text has overflowed is still a valid picture.

**Journey 9 intercepts the outbound request** rather than reading the `href`, which
`careers.spec.ts` already does. That is the part an attribute check cannot reach: a relative URL, a
router-intercepted click, or a stray `preventDefault` would each keep the `href` correct while
sending nobody anywhere. It also asserts the parameter set is *exactly* `track`, `locale`, `src` —
no personal data leaves this domain (§6), and a field quietly added to that link is how that would
stop being true.

---

## Baseline coverage, and why it is asymmetric

Three viewports in English, plus German at 390px — not the twelve the home page has. Careers copy is
English-only, so `/es/careers` and `/careers` differ in the chrome and nothing else; four locales
would be twelve photographs of the same page and twelve files to re-approve on every copy change.
What the other locales genuinely risk is text *length*, and German at the narrowest viewport is the
worst case for that — including the mixed string "Als Registered nurse bewerben", longer than either
language alone suggests.

If D-5 is ever settled toward translating careers content, this asymmetry stops being justified.

---

## Open with `hc-professional`

Unchanged from C1 and C2, and now the only thing between this page and real candidates:

1. **Does `/register` accept `track`, `locale` and `src`, and degrade gracefully without them?**
   Journey 9 proves this side sends them correctly. It cannot prove anyone reads them.
2. Where does `src` surface, so the funnel in careers-plan §8 can be joined?
3. Does the flow tolerate an approved professional with no duty roster? Three advertised tracks
   have none.
4. Deferred: a `request-invitation` surface, whenever the invitation path is wanted.

## Still open

- **D-3** (terms) blocks `JobPosting` structured data. **D-4** (review turnaround) blocks any stated
  timescale. **D-6** (indexing) is Phase C4.
- **D-5** now has a visible consequence rather than a theoretical one: every non-English careers page
  carries `lang="en"` markers. They are correct, and they are also a standing signal that the page
  is not translated.
- Phases C1, C2 and C3 are **not yet deployed** to `web.abofonsa.com`. The live site still runs the
  pre-careers build, without the careers page, the contrast fix, or the language marking.
