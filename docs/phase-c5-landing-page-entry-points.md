# Phase C5 — the apply buttons go live, and the landing page starts recruiting

**Task 147 of [`careers-plan.md`](../careers-plan.md).**

Two things happened, and only one of them is code.

**The portal is answering.** `professional.abofonsa.com` now serves the `hc-professional`
application, and `professionalPortalUrl` has been set in the mini CMS. That is the entire activation:
all eight apply calls-to-action on `/careers` — the hero, the closing band, and one per track — are
live, in every locale, with no deploy. This is exactly the mechanism Phase C4 built and the reason it
was built that way; the switch was designed to be thrown by an editor on the day the far side started
serving, and it was.

**The landing page now has its own way in for clinicians**, which is a code change and a reversal.

---

## What was verified about the far side

`GET https://professional.abofonsa.com/register?track=ROLE_NURSE&locale=en&src=web-careers` answers
`200` and serves the `hpd-app` shell — the `hc-professional` frontend, not a sibling's application
picked up by a stray `listen 80` block. Combined with the receiving side's implementation recorded in
[careers-handoff-contract.md](careers-handoff-contract.md) (`web@2b46297` / `api@fba5b5c`, plus
`web@0088d95` / `api@ec82f24` for Spanish), all four contract items are done and the destination is
real.

**What that check does not prove, and nothing short of a browser will:** the portal is a single-page
application, so `/zzz-not-a-page` answers `200` as well. A `200` on `/register` says the host and the
SPA fallback are healthy, not that the register route renders. The handoff should be clicked through
in a real browser once, which is the same rule the workspace already applies to any deploy touching a
dashboard.

---

## The reversal, stated plainly

careers-plan.md §5 said: *"A restrained entry point only: one footer link, one nav item. Careers
content does not go on the family-facing home page."* CR-1 gave the reason — a family evaluating care
for a parent reads recruitment copy as *"they are short-staffed"*.

The owner asked for prominent professional sign-up links on the landing page. That is a product call
and it is theirs to make, so the plan's §5 and CR-1 are now recorded as superseded rather than
quietly ignored. What the implementation does is keep the *reasoning* behind CR-1 doing work even
though its conclusion changed:

- **Placement.** The band sits after the closing family call-to-action and before the contact
  section, so the care argument is made in full before the page addresses anyone else. `e2e` asserts
  the ordering, because that ordering is the mitigation and a screenshot would accept any arrangement
  it was shown first.
- **Voice.** The copy is addressed *to clinicians* ("Join the clinicians behind BridgeCare") rather
  than *about staffing* ("we are hiring"). The difference is the whole of CR-1.
- **It still routes through the requirements.** Two links, because they answer two different people:
  someone who already knows gets "Create your account" straight to the portal; someone who does not
  gets `/careers`, where eligibility, requirements and the document list live. The direct link
  carries the preparation line with it — council licence, certificate, Ghana Card or passport — so
  the shortcut does not simply move unprepared applications further down the credentialing queue,
  which is what careers-plan.md §1 says this whole surface exists to prevent.

## What changed

| Change | Note |
|---|---|
| `public/sections/professional-cta.ts` | The new band. Nineteen home-page components, where spec §6 has eighteen. |
| `site-header.ts` | The careers item went from the quietest thing in the bar to a gold-outlined button, relabelled **For professionals** — "Careers" makes a visitor work out who it is for. |
| `site-header.ts` (mobile) | **The drawer had no careers entry at all.** Desktop had one, the drawer did not, so below 1024px the only route to the page was the footer. |
| `core/api/professional-handoff.ts` | `handoffUrl` and `PROFESSIONAL_PORTAL` moved out of the lazily-loaded careers chunk so the home page can build the same link without dragging careers code into the initial bundle. Re-exported from the old path, which a dozen call sites and tests still name. |
| `src=web-home` | New *value*, not a new parameter — the contract is still exactly three. The home page and the careers page are two different arguments and only the far end can say which converts. |
| i18n × 4 | UI strings, not CMS content, deliberately: careers CMS copy is English-only (D-5), and a section key here would have put English prose inside `<html lang="es">` on the *home* page. Bundle parity is enforced in CI; CMS content is not. |

Nothing was seeded, migrated or compiled in. `professionalPortalUrl` stays what Phase C4 made it — a
content field an editor owns — so clearing it in the CMS still withdraws every apply button on the
site, the home page's included, within one publish and without a release.

## A defect found by making the nav item louder

**The desktop header has never fitted at the width it appears at.** It was shown from `lg` (1024px),
and measured against the pre-change markup it needed **1066px in English and 1152px in German** — so
at 1024px it overflowed the viewport in every language, and in French it needed **1218px inside its
own 1152px container**, spilling even on a 1440px screen.

Nothing in the suite could see it. `branding.spec.ts` guards horizontal overflow at 390px, where this
bar is hidden; the visual baselines are taken at 390, 834 and 1440, and none of those is a width
where the bar is both visible and short of room. Turning the careers link into a button added 42–63px
to a bar that was already over, which is the only reason it surfaced.

Fixed by the breakpoint and the spacing rather than by a shorter label: the bar now appears at
**1240px** with `gap-4` instead of `gap-5`, and below that the drawer takes over — which is safe
precisely because the drawer now carries every item the bar does, careers included. Six new e2e cases
pin it, at 1024 / 1240 / 1440 in French and German, asserting both that the page does not scroll
horizontally and that the bar is hidden below the breakpoint rather than merely quiet.

**What is fixed is the page overflow, not the crowding.** The bar's labels need 1309px in English and
1559px in French laid out on one line, inside a container that is 1152px wide at every viewport — so
in every language the labels wrap onto two and three lines within a 64px-tall bar, and the
consultation button is clipped top and bottom in French. That is **not new**: the pre-change
`home-desktop-fr` baseline shows exactly the same wrapping, and it was accepted then. This change
swaps a plain "Carrières" link for a bordered button of comparable footprint, so it neither causes
nor materially worsens it. Fixing it properly means shortening labels or widening the header's
container past `max-w-6xl`, both of which are the owner's call rather than a side effect of a careers
task — recorded here so the next person measures rather than rediscovers.

## Verified

- 168 frontend unit tests (165 before, plus three for the new band), lint, `ng build`, i18n parity,
  and `spotless:check` on the API — all green. The new band's tests cover both states of the switch,
  because the withdrawn state is the one nobody would notice regressing.
- **e2e against the full local stack: 91 cases, all passing**, of which 28 are the careers page and
  the new landing-page entry points. That includes axe-core over the home page in four
  locales, which is what the band's colours had to survive: `text-brand-muted` was 4.43:1 on cream in
  the first draft of the preparation line, under AA for 14px text, and was changed to the body colour
  at 7.17:1 before axe ever saw it.
- **The twelve `home-*` visual baselines were regenerated and looked at**, not merely accepted. The
  other eight snapshots — the four `careers-*` and the Material control shots — still pass against
  the existing images, which is the evidence that this browser renders the same as the one that
  produced them, so the twelve diffs are this change and nothing else.
- `check-bundle-size`: 122.0 kB gzipped initial against a 220 kB budget. The careers chunk is still
  lazy — the shared handoff helper lives in `core/`, which is why moving it mattered.
- Angular's own raw-size warning (`900 kB` initial) was already tripped before this change: the new
  code contributes 2.35 kB of the 5.24 kB overshoot. Worth a separate look; it is a warning, and the
  error threshold is 1 MB.

## Not done

- **The handoff has not been clicked through in a browser.** The `200` from `/register` is a healthy
  host and a healthy SPA fallback, nothing more; whether the register route renders and keeps the
  parameters is the one thing left to confirm on the far side.
- **The seeded local/CI state still has no portal**, so locally the band shows only its "See roles
  and requirements" link while production shows both. That is the design — availability is not a
  build-time fact — but it does mean the direct-registration path is exercised in tests only through
  `withPortalConfigured`.
- **The header's crowding**, above — bounded and measured, not fixed.
- **D-6 (indexing) is now worth revisiting.** It was decided "stays off" partly because indexing a
  recruitment page whose apply buttons were hidden "converts nobody and teaches the search engine the
  page is thin". The buttons are no longer hidden, so that half of the argument has expired.
