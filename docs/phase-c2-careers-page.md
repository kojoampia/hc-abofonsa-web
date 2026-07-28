# Phase C2 — the careers page

**Tasks 134–139 of [`careers-plan.md`](../careers-plan.md).** Branch `phase-c2-careers-page`.

All green: 99 backend tests with the coverage gate, 159 frontend unit tests, 46 e2e, lint, i18n
parity (125 keys).

---

## What was built

| Task | Delivered |
|---|---|
| 134 | `/careers` and `/{locale}/careers`, lazily loaded — 2.95 kB gzipped in its own chunk, fetched only on navigation |
| 135 | Hero, "what the work is like", track cards, process explainer, applicant FAQ, closing CTA |
| 136 | The process explainer, rendering the onboarding status model in plain language |
| 137 | Handoff CTAs carrying `track`, `locale` and `src`; invitation CTA behind a CMS-supplied destination |
| 138 | Title, description, canonical, hreflang — and deliberately **no** `JobPosting` structured data |
| 139 | Header and footer entry points, locale-prefixed |

The page is content-driven throughout: six track cards, four sections and six FAQs all come from
the CMS via `/api/v1/content/careers`, so copy changes need no deploy.

---

## The handoff is the whole page

Everything else exists to get someone to this link:

```
https://professional.abofonsa.com/register?track=ROLE_NURSE&locale=en&src=web-careers
```

It is cross-domain, so there is no shared session — whatever the other side needs has to survive in
the URL. `track` so the role chosen here is not asked again, `locale` so the candidate is not
dropped back into English mid-application, `src` so the funnel can be joined at the far end.
Asserted per card in `e2e/careers.spec.ts`: a card whose link carries the wrong role would send
someone to be asked their role a second time, and nothing else would catch it.

**The invitation CTA is switched by a URL, not a boolean.** The plan sketched a boolean; a boolean
can be turned on while `/request-invitation` does not exist on the professional side, and would
then send candidates to a 404. `siteSettings.professionalInvitationUrl` costs the same and cannot
be enabled without a destination. Seeded null, so the CTA is currently absent — asserted.

---

## Two things deliberately not done

**No `JobPosting` structured data** (task 138). It requires employment type, and search engines
additionally expect either a salary or an explicit statement of its absence. D-3 leaves both
undecided, so every one of those values would be invented — and a partially-populated `JobPosting`
publishes a claim about terms into search results. The e2e asserts its absence rather than
trusting it.

**No timescales anywhere.** Step 7 of the onboarding workflow has no SLA and no named owner (D-4),
so the process explainer describes the four *stages* instead. Step 3's copy says a returned
application is "a normal step, not a rejection" — `returned_for_correction` is a real state, and a
candidate who does not know that reads silence as failure and stops replying.

---

## What verifying the budget uncovered

Task 134 asked for "`check-bundle-size` unchanged". It was — it reported the initial bundle had
*fallen* from 153 kB to 121 kB. That improvement was not real, and chasing it found a production
defect.

### The gate was measuring a third of the page

`check-bundle-size.mjs` reads the chunks named in `index.csr.html`. It cannot see chunks the app
pulls in with a dynamic `import()` during hydration. Measured in a browser, the home page fetches
**17 JavaScript files; the gate saw 11** — missing six, including the single largest at 196 kB.

The 153→121 "improvement" was chunks moving between those two categories, not code disappearing.

### And the bytes were not compressed

Measuring the real transfer showed **845 kB of JavaScript on the home page**, uncompressed — even
when a client explicitly asked for gzip:

```
$ curl -sI -H 'Accept-Encoding: gzip' https://web.abofonsa.com/main-YU2QKZLI.js
content-length: 201519        # no content-encoding
```

`nginx.conf` on the host sets `gzip on` but leaves `gzip_types` commented out, so nginx's default
applies and **only `text/html` is compressed**. Two details made it stick:

- The SSR server labels bundles `text/javascript`. A `gzip_types` list containing only
  `application/javascript` — the more common spelling — would still have missed every one.
- All of this content arrives via `proxy_pass`, and nginx does not compress proxied responses
  without `gzip_proxied`.

Fixed per-server in `infra/prod-server/abofonsa.conf`, matching how `jojoaddison.conf` on the same
host does it, and applied to the deployed vhost by inserting into it rather than overwriting —
certbot has rewritten that file and owns the TLS block.

```
main.js:   201,519 → 53,558 bytes   (73% smaller)
home page: 604 kB  → 154 kB gzipped
```

For a site whose stated audience is mid-range Android on a slow connection (§13.1), this was the
largest performance defect in the deployment, and the budget gate could not see it.

### The gate now says what it does and does not cover

`check-bundle-size.mjs` keeps its job as the fast pre-build check, with its limits stated in its own
header. A browser-based assertion in `e2e/visual.spec.ts` now loads the page for real and counts
everything that crosses the wire — the only honest measure, and the one that would have caught this.

**Correction to earlier reports:** the "153.2 kB initial, 66 kB headroom" and "121 kB, 99 kB
headroom" figures I gave in Phases 18 and C2 describe HTML-referenced chunks only. They were never
what a visitor downloads.

---

## Also fixed while here

- **Canonical URLs kept their exact shape.** Adding a `path` argument to `SeoService.urlFor` briefly
  turned `/es` into `/es/`. The router serves `/es`, and a canonical pointing at a URL that is
  arguably a different one is worse than none. Caught by an existing test.
- `applyPage` clears the home page's JSON-LD, so a routed page cannot inherit structured data
  describing something else.
- `hreflang` alternates on `/careers` point at `/careers` in each locale, not at the home page.

---

## Open with `hc-professional`

Unchanged from Phase C1, and now blocking real candidates rather than a plan:

1. **Does `/register` accept `track`, `locale` and `src`, and degrade gracefully without them?**
   Every button on this page depends on it.
2. Where does `src` surface, so the funnel in careers-plan §8 can be joined?
3. Does the flow tolerate an approved professional with no duty roster? Three advertised tracks
   have none.
4. Deferred: a `request-invitation` surface, whenever the invitation path is wanted.

## Not in this phase

Phase C3 (tasks 140–143) — axe-core over `/careers` in four locales, visual baselines at three
viewports, and the i18n parity check for the new strings. Baselines were regenerated here because
the header gained an item; the dedicated careers coverage is C3.
