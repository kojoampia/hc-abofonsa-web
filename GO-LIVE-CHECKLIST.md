# Go-live checklist

Everything in this list was **built to a documented default** (spec §14.2). None of it is blocked —
the site works as it stands — but each item is a decision the client owns, and shipping a default
nobody confirmed is how a placeholder ends up in production.

Tick each line, or change the behaviour and then tick it. The "where" column is what to change if
the answer differs from the default.

---

## Blocking — confirm before the site is publicly reachable

### 1. Domain and indexing

- [x] **Domain confirmed: `web.abofonsa.com`**, for a production review.
- [ ] **Decide whether the apex `abofonsa.com` should also point here.** It is deliberately not
      claimed today — a server block for it would take it over for anything resolving to this host.
- [ ] **`SITE_INDEXABLE` — reopen the decision.** D-6 decided "stays off" on two grounds: this host
      is not yet the announced public site, **and** `professional.abofonsa.com` was not serving, so
      indexing `/careers` while its apply buttons were hidden would have put a recruitment listing in
      front of applicants who could not apply. **The second ground has expired** (task 147: the portal
      serves, the buttons are live, and the landing page now links to them). The first still stands,
      so nothing has changed by itself — but the flip is now a domain decision alone, not a domain
      decision waiting on another repository.
- [ ] **When that flip happens, check `sitemap.xml` appears and `robots.txt` names it.** Both are
      generated from the same flag, so they cannot disagree — but confirm rather than assume, and
      submit `/careers` and `/{locale}/careers` at that point.

Canonical and hreflang URLs are derived from the request, so they follow whatever host serves the
page and cannot point at the wrong origin. While `SITE_INDEXABLE=false` the site serves `noindex`, a
disallow-all `robots.txt`, and no `sitemap.xml` at all — a sitemap listing URLs that `robots.txt`
forbids would have the site contradicting itself.

Unknown URLs answer `404`. They used to answer `200` with the not-found page, which no visitor would
notice and a crawler would read as hundreds of thin duplicate pages. That mattered only once
indexing was enabled, which is why it was fixed before the decision rather than after it.

The default is off on purpose. A launch that forgets to opt in is simply not indexed for a few days
and is fixed by one variable; a review host that forgets to opt out gets crawled on a public domain,
competes with the real site, and is slow and only partly reversible to remove from an index.

*Where:* `SITE_INDEXABLE` in the server's `.env` (`infra/prod-server/.env.example`);
`infra/prod-server/nginx-abofonsa.conf` for the served hostnames.

### 2. The free-first-month offer

- [x] **Confirmed as a real offer, and it ends 31 January 2027** (confirmed 2026-08-25).
- [ ] **Someone diarises the end date.** Nothing expires on its own — see below.

The landing page pitches **the first month of care free**. That is a priced promise: at the seeded
plan prices it is worth **GH₵3,000 to GH₵8,000** per subscriber, and it is the first thing a visitor
reads after the hero. Nothing in the repository or the CMS said anything of the kind before
2026-08-25 — it exists because it was asked for, not because it was found.

Three things worth settling before it stays up:

1. **Who absorbs it?** The end date is settled — **31 January 2027**, and the page says so — but
   **nothing enforces it.** There is no scheduled unpublish: on 1 February 2027 an editor has to
   unpublish the `patientOffer` section, or the site goes on offering a free month indefinitely. The
   date is in the copy, so until someone acts the page contradicts itself rather than merely
   over-promising, which is the better of the two failures but still one to diarise.
2. **What happens at the end of month one?** The band says the minimum three-month term and 30 days'
   notice still apply, so a family who leaves after the free month is inside a term they agreed to.
   That is defensible, but it must be what is actually intended, and billing has to match it.
3. **Does `hc-patient` know?** A family arrives at `/account/register` expecting what the landing page
   just promised. If registration or onboarding states pricing anywhere, the two must agree — see
   [docs/patient-handoff-contract.md](docs/patient-handoff-contract.md).

Withdrawing it is one action and needs no deploy: unpublish the `patientOffer` section. The sign-up
button is separately switched by `siteSettings.patientPortalUrl`, so the offer and the door can be
taken down independently.

*Where:* CMS → Sections → `patientOffer`, and `api/.../dbmigrations/V020SeedPatientOfferSection.java`
for the seeded wording.

### 3. Testimonial consent

- [ ] **The four seeded testimonials are real, with consent evidenced** — or they have been
      replaced.

Spec §14.2 #3 defaults to treating them as placeholders. They name identifiable people in a
healthcare context, which is exactly the case where publishing without evidence is a real harm,
not a formality.

The system already refuses to publish a testimonial whose `consent.obtained` is false — that gate
is server-side (`PublishingService`), not a UI nicety, and journey 6 tests it. What it cannot
check is whether a `true` recorded against seeded data reflects an actual conversation with an
actual person. Record the evidence reference in the CMS field provided.

*Where:* CMS → Testimonials, or `api/.../dbmigrations/` if reseeding.

### 4. Demonstration banner

- [ ] **The demo banner is gone in production.**

Already handled by configuration: `environment.isDemo` is `false` in the production file
replacement, so the banner does not render in a production build. Verify it on the deployed site
rather than trusting the flag — this is one `curl` and it is the most visible thing on the page if
it is wrong.

```bash
# Captured first: piping a large response into grep can misreport under `set -o pipefail`.
home="$(curl -s https://web.abofonsa.com/)"
grep -qi "demonstration" <<<"$home" && echo "STILL PRESENT" || echo "clear"
```

*Where:* `web/src/environments/environment.ts`.

### 5. Bootstrap admin password rotated

- [ ] **The first admin login rotated the password**, and the original from `.env` is now dead.

The account is created with `mustChangePassword=true` and every other endpoint refuses to serve
that token until it is changed, so this is enforced rather than remembered. This item confirms it
actually happened — the gate proves the mechanism exists, not that anyone used it.

After rotating, the value in the server's `.env` is stale. Leave it (it is inert) or blank it; do
not reuse it anywhere.

*Where:* `https://web.abofonsa.com/admin` at first login.

---

## Confirm-or-change — defaults already built, no work needed if they are right

### 6. Enquiry retention: 24 months

- [ ] Confirmed, or changed.

Enquiries are deleted automatically after this period by a TTL index. Free-text enquiry messages
are treated as potentially health-related throughout (risk R-10), which is the reason there is a
retention period at all rather than keeping them indefinitely.

Shortening it is safe. **Lengthening it does not resurrect anything already deleted** — the TTL has
been running since the first deploy.

*Where:* `abofonsa.enquiry.retention-months` in `api/.../config/application.yml`.

### 7. Pricing in GHS only

- [ ] Confirmed, or a second currency requested.

Prices are stored as `NumberDecimal` and formatted per locale — a Spanish visitor already sees
`3.000 GH₵`, not a translated number in a different currency. Adding a second *currency* (as
opposed to a second format) means an exchange-rate source and a decision about how often it
updates, which is a feature, not a setting.

*Where:* `PriceFormatter`, and the `price.currency` field on each plan.

### 8. Enquiries are stored, not emailed

- [ ] Confirmed, or forwarding requested.

Enquiries land in the CMS inbox and nowhere else. Nobody is notified. If the coordination desk
expects an email, **they will not get one**, and an enquiry could sit unread — worth confirming
explicitly with whoever staffs that desk, because the failure is silent.

Adding SMTP forwarding is small. Note that it copies personal data into a mailbox with its own
retention, outside the TTL above.

*Where:* `EnquiryService`.

### 9. Four locales

- [ ] Confirmed no fifth language is expected at launch.

English, Spanish, French, German. Adding a fifth needs no schema change — it is a new bundle plus
a locale entry — so this is a "not now" rather than a "not ever".

*Where:* `abofonsa.locales.supported`, `web/public/i18n/`.

---

## Operational — after the first deploy

### 10. First backup verified by restoring it

- [ ] A backup has been taken **and restored into a scratch stack**.

`backup.sh` proves a backup can be *taken*. Only a restore proves one can be *used*, and the gap
between those two is where backup strategies fail. Do this once before launch, not after the first
incident. Procedure in `infra/PRODUCTION_DEPLOYMENT_PLAN.md`.

- [ ] The quarterly restore test is scheduled with an owner (spec §12.4).

A cadence with no name against it does not happen.

### 11. Monitoring is actually receiving data

- [ ] Prometheus is scraping `/actuator/prometheus` and the alert rules are loaded.
- [ ] The blackbox check is probing both the home page and `/api/v1/health`.
- [ ] At least one alert has been deliberately fired end-to-end to a real destination.

An alert rule that has never fired is a hypothesis. The uptime check matters most and is the one
that must **not** depend on the app's own metrics pipeline: if the API is down it is not scraping,
and an absent series is not an alert.

*Where:* `infra/observability/`.

### 12. Branch protection and the release gate

- [ ] The four CI checks are required on `main`.
- [ ] The `production` GitHub environment has required reviewers.

Until the environment exists, the release workflow builds images and stops before deploying. The
approval gate is a repo setting rather than a workflow step precisely so that editing the workflow
cannot remove it. Details in `CONTRIBUTING.md`.

---

## Known gaps at launch

Stated here so they are decisions rather than surprises:

- **Images are JPEG/PNG, not AVIF/WebP.** The responsive `<picture>`, `srcset`, `sizes`,
  intrinsic dimensions and blurHash placeholders are all in place, and the markup already groups
  renditions by format — so adding modern formats later needs no frontend change. What is missing
  is server-side encoding: Java's ImageIO cannot write AVIF or WebP without a native encoder, and
  bundling one into an Alpine runtime is a real dependency decision, not a config flag. The
  Lighthouse budget flags `modern-image-formats` as a warning for this reason.
- **Lighthouse CI is configured but has never been run.** Budgets and mobile throttling are in
  `web/lighthouserc.json`; nothing has measured the deployed site against them yet. Run it against
  staging before launch.
- **Two dependencies outside this scan's reach need patching independently.** The OWASP scan covers
  Java dependencies only. It flagged MongoDB Server and Prometheus Server CVEs that turned out to be
  CPE mismatches against Java libraries (suppressed, with reasoning, in
  `api/dependency-check-suppressions.xml`) — but the real server products are deployed here as
  container images and are genuinely in scope for patching:
  - [ ] **MongoDB image is patched.** CVE-2025-14847 is on CISA's Known Exploited Vulnerabilities
        list. Confirm the deployed `mongo:8.3` image is not affected, or move to a patched tag.
  - [ ] **The shared Prometheus server is on 3.5.3 / 3.11.3 or later** (CVE-2026-42154, unauthenticated
        memory exhaustion via `/api/v1/read`). It belongs to `~/webroot/00-admin/monitoring`, not to
        this project, but this project is about to start relying on it.
- **Accessibility is verified by automation plus one manual pass.** axe-core is clean across all
  four locales and the CMS, and blocks CI on serious/critical findings. Automated tooling catches
  roughly a third of real accessibility defects, so spec §11.4's manual keyboard and screen-reader
  pass per release still stands.
