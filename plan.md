# Abofonsa BridgeCare — Implementation Plan

Target: build the production system described in `Abofonsa_BridgeCare_Technical_Specification.md` —
an Angular 22 SSR public site + Spring Boot 4.1 (Java 25) API + MongoDB 8.3, reproducing
`Abofonsa_BridgeCare_Website.html` section-for-section, with the `/admin` mini-CMS — through to a
production deployment on `webserver` alongside the other Health Connect apps.

`Abofonsa_BridgeCare_Demo.html`, `Abofonsa_BridgeCare_Website.html`, `site_assets.json` and the
`i18n-{en,es,fr,de}.json` bundles are the visual/content source of truth. Nothing in this plan edits
them; they get rehomed into the new repo layout (§4 of the spec: `web/public/i18n/`, Mongock seed
data transcribed from the HTML) and then remain in the repo as design reference, exactly as the spec
already documents in Appendix A/B.

## Assumptions carried from the spec (flag if wrong)

- **Monorepo layout**: `web/` (Angular 22) + `api/` (Spring Boot 4.1) in this repo, per spec §4 —
  not split into separate repos.
- **Domain**: `www.abofonsa.com`, taken from the `siteSettings.website` value already used as
  example data in spec §8.2. Not independently confirmed with the client — verify before Phase 20's
  DNS/certbot steps.
- **Media storage**: local filesystem behind nginx (spec §14.2 decision #6 default), not object
  storage — matches the pattern already used for `hc-crowdfund-app` on the same server, where no
  app currently uses object storage.
- **Demo banner**: removed for production (spec §14.2 decision #2 default); `DemoNoticeBar` (§6
  component 1) ships but is compiled out via `environment.isDemo`.
- **Testimonials**: seeded with `consent.obtained: true` as placeholders per spec §14.2 decision #3
  default — flagged in the seed changelog's own comment and in Phase 20's go-live checklist as
  needing real evidence before the four testimonials currently in the prototype go live unedited.
- **Enquiry retention**: 24 months, GHS-only pricing, four locales, enquiries stored only (no email
  forwarding) — all spec §14.2 defaults, unchanged.
- **Build tool**: Maven (spec assumes this throughout; Gradle would be a straightforward swap if
  preferred, not assumed here).

## Deployment target (mirrors `hc-crowdfund-app`'s production conventions)

`../hc-crowdfund-app/infra/PRODUCTION_DEPLOYMENT_PLAN.md` and `infra/prod-server/compose.yml`
establish the conventions already in use on `webserver` (199.247.5.252); this plan follows them
rather than inventing a new shape. That document itself notes `~/webroot/01-healthconnect/` already
contains an empty placeholder directory for `abofonsa`, confirming the app name to use.

| Aspect | Convention (from `hc-crowdfund-app`) | Applied here |
|---|---|---|
| Deploy path | `~/webroot/{NN}-{name}/{app}/` | `~/webroot/01-healthconnect/abofonsa/` |
| File naming | `compose.yml` + `.env` (mode 600, not in git) | Same |
| Docker network | Dedicated external `<app>net`, not shared with sibling apps | `abofonsanet` |
| Public exposure | Container publishes `127.0.0.1:<port>` only; host nginx (Certbot-managed TLS) reverse-proxies | Same, `www.abofonsa.com` |
| Project naming | `name:` pinned explicitly in `compose.yml` so `--remove-orphans` can't touch unrelated containers | `name: hc-abofonsa` |
| Images | Pre-built, pushed to `docker.jojoaddison.net/hc-abofonsa-{api,web}` via a `deploy.sh`, tagged by short commit SHA + floating `:latest` | Same pattern |
| Observability | Backend joins the external `monitoring` network; OTel Java agent baked into the image, `JAVA_TOOL_OPTIONS` set only in the prod compose file | Same — `OTEL_SERVICE_NAME: hc-abofonsa-api` |
| Backups | No prior convention on that server before `hc-crowdfund-app` added one; this plan follows suit | Nightly `mongodump`, 14-day retention |
| Deploys | Manual runbook, not CI/CD automation, matching the other apps on that host | Same |

The one structural difference: this app needs a MongoDB **replica set** (spec §2.1/§7.2, required
for transactions and change streams) rather than a single Postgres instance, so the prod `compose.yml`
needs a one-time `rs.initiate()` step that `hc-crowdfund-app` didn't need — called out explicitly in
Phase 20.

## Repository layout

Per spec §4 — a two-module monorepo, frontend and backend build independently but version together:

```
abofonsa-bridgecare/
├── README.md
├── docker-compose.yml                 # mongo + api + web, local dev
├── .github/workflows/ci.yml
├── web/                                # Angular 22 (SSR)
│   ├── public/i18n/{en,es,fr,de}.json  # ← renamed from the repo-root i18n-*.json files
│   └── src/app/{core,shared,public,admin}/
├── api/                                # Spring Boot 4.1 / Java 25 — JHipster package convention
│   │                                   #   (matches hc-admin/hc-admin-ms; auth shape follows hc-admin-gw)
│   └── src/main/java/net/jojoaddison/abofonsa/
│       ├── domain/ (+ enumeration/)    # entities, plain names (CareService, Plan, Faq, ...)
│       ├── repository/                 # Spring Data repositories
│       ├── service/ (+ dto/, mapper/)  # services, *DTO records, hand-written mappers
│       ├── web/rest/ (+ errors/)       # *Resource controllers, ExceptionTranslator
│       ├── security/                   # auth utilities (Phase 5)
│       └── config/ (+ dbmigrations/)   # *Configuration classes, ordered Mongo changelogs
│       # resources: application*.yml live under src/main/resources/config/
└── infra/prod-server/                  # versioned copy of what's deployed on webserver (Phase 20)
    ├── compose.yml / infra.sh / start / backup.sh / nginx-abofonsa.conf
```

---

## Task list

Each task has a concrete verification step. Work through phases in order — later phases depend on
earlier ones. Task numbers are sequential across the whole plan.

### Phase 0 — Repo & tooling scaffolding

- **[0]** Create the `web/`, `api/` two-module layout above; root `README.md` describing the dev
  workflow (`docker compose up -d mongo`, backend run, frontend run, per spec §12.1).
  *Verify*: tree matches the layout above; `README.md` renders all three commands.
- **[1]** Rename `i18n-{en,es,fr,de}.json` → `web/public/i18n/{locale}.json` (spec Appendix A
  instruction). Leave `Abofonsa_BridgeCare_Demo.html`, `Abofonsa_BridgeCare_Website.html`,
  `site_assets.json` and `abofonsa-logo-original.png` at the repo root as design reference.
  *Verify*: files exist at the new path; a quick `jq` diff of the four files' key sets (top-level
  flatten) shows no divergence — this becomes `scripts/check-i18n.mjs` for real in Phase 13.
- **[2]** Add root `.gitignore` (Maven `target/`, Node `node_modules/`/`dist/`/`.angular/`, IDE,
  Docker volumes) and `.editorconfig`.
  *Verify*: `git status` after a build of both modules shows nothing untracked from either.
- **[3]** Add `docker-compose.yml` with a single-node MongoDB 8.3 **replica set** for local dev
  (required for transactions/change streams per spec §2.1/§7.2).
  *Verify*: `docker compose up -d mongo`; `mongosh --eval "rs.status()"` shows one `PRIMARY` member.
- **[4]** Add `CONTRIBUTING.md` with a placeholder test-command list (filled in as later phases add
  real commands) and a `.github/workflows/ci.yml` skeleton mirroring spec §12.2's stage names.
  *Verify*: workflow YAML parses (`actionlint` or GitHub's own validation); file exists.

### Phase 1 — Backend foundation

- **[5]** Scaffold `api/` as a Spring Boot 4.1 Maven project, Java 25
  (`<maven.compiler.release>25</maven.compiler.release>`), dependencies per spec §7.2 (`web`,
  `data-mongodb`, `validation`, `security`, `oauth2-resource-server`, `cache`, `caffeine`, `mongock-springboot`).
  *Verify*: `./mvnw -q compile` succeeds; no `--enable-preview` anywhere (spec §3.1/§7.9 forbid it).
- **[6]** Add `application.yml` per §7.2: `spring.threads.virtual.enabled: true`, locale config,
  `abofonsa.cache.published-content-ttl`, JWT issuer/TTLs, enquiry rate limit.
  *Verify*: `./mvnw spring-boot:run` against the Phase 0 compose Mongo starts on `:8080`.
- **[7]** Add `GET /api/v1/health` (Actuator liveness/readiness).
  *Verify*: `curl localhost:8080/api/v1/health` → 200.
- **[8]** Add the RFC 9457 `ApiExceptionHandler` (§7.6) for validation, not-found, and
  unsupported-locale problems.
  *Verify*: unit test triggers each exception type, asserts the `ProblemDetail` shape and that no
  stack trace or internal message leaks for a generic 5xx.
- **[9]** Add the common domain types: `LocalizedText` (with `resolve`/`hasTranslation`/`completeness`),
  `Locale` enum, `PublicationStatus`, and the sealed `ContentEntity` hierarchy (§7.3).
  *Verify*: unit test on `LocalizedText.resolve()` fallback to `en`; a `switch` over `ContentEntity`
  fails to compile without a branch for a newly added permitted type (exhaustiveness check).
- **[10]** Configure JaCoCo (build-breaking threshold, start at 70% on service packages) and
  Spotless/Checkstyle formatting, both wired into `./mvnw verify`.
  *Verify*: a badly formatted file fails `verify`; `spotless:apply` fixes it; coverage gate fails
  below threshold.
- **[11]** Add a shared Testcontainers (MongoDB 8.3) base integration test class.
  *Verify*: two independent integration test classes extend it and pass together in one
  `mvn verify` run with no port conflicts.

### Phase 2 — MongoDB data model & seed migrations

- **[12]** Add Mongock changelog `V001_create_collections_and_indexes`: all 11 collections, JSON
  Schema validators, and the index list from spec §8.3 (`auto-index-creation: false`).
  *Verify*: `mongosh` lists all 11 collections with validators attached; `db.plans.getIndexes()`
  matches §8.3.
- **[13]** `V002_seed_site_settings` — singleton `siteSettings` document (unique index on
  `singleton`), transcribed from the prototype's top strip / footer / address.
  *Verify*: exactly one document; a second insert attempt violates the unique constraint.
- **[14]** `V003_seed_sections` — hero, assurance, process, approach, stats, angel, cta, all four
  locales, transcribed per spec Appendix B's prototype-element mapping.
  *Verify*: 7 documents; every localised field has a non-blank `en` value (schema-enforced).
- **[15]** `V004_seed_services` — the six service slides (name, blurb, 4 bullets, `availableOn`).
  *Verify*: 6 documents; `slug` values unique and stable.
- **[16]** `V005_seed_plans` — PEAR/PAWPAW/MELON using the canonical values table in spec §8.5
  (`Decimal128` prices, exactly one `featured: true`, full `comparison` block).
  *Verify*: `price.amount` values are 3000.00/5000.00/8000.00 GHS via `Decimal128`, never a double;
  exactly one `featured: true`.
- **[17]** `V006_seed_testimonials` — four testimonials with `consent.obtained: true`, flagged in a
  changelog comment as placeholder pending real evidence (spec §14.2 #3; see Phase 20's checklist).
  *Verify*: 4 documents; consent block present on all.
- **[18]** `V007_seed_faqs` — seven entries grouped by `category`.
  *Verify*: 7 documents; `category` values within the enum.
- **[19]** `V008_seed_admin_user` — bootstrap `ADMIN` account, password from an env var (never a
  literal in the changelog), `mustChangePassword: true`.
  *Verify*: document exists with a BCrypt hash (not plaintext) and the flag set.
- **[20]** Add Spring Data repositories for all 11 collections, one per vertical-slice package.
  *Verify*: `@DataMongoTest` saves and reloads one document per repository, asserts field equality.
- **[21]** Add the `contentRevisions` append-only write helper shared by every content service
  (write path only — no controller yet).
  *Verify*: unit test: two sequential saves of the same entity produce `revisionNumber` 1 then 2;
  the first snapshot is never mutated.

### Phase 3 — Public content API

- **[22]** Add the flat view records (`ServiceView`, `PlanView`, `PlanFeatureView`,
  `TestimonialView`, `FaqView`, `MediaView`) and explicit mapper classes — no reflection-based
  mapping, no `LocalizedText` crosses the API boundary (§7.4).
  *Verify*: unit test maps a multi-locale document to a view for `de`, asserts fallback to `en`
  where `de` is blank.
- **[23]** Add `SiteContentService.publishedSite(locale)` aggregating `siteSettings` + `sections` +
  `services` + `plans` + `testimonials` + `faqs`, `PUBLISHED` entities only.
  *Verify*: integration test's response shape matches the §7.4 example JSON exactly.
- **[24]** Add the Caffeine `CacheConfig` (`siteContent`, `i18nBundle`, §7.8) and `@Cacheable` on
  `publishedSite`.
  *Verify*: Actuator cache stats show a hit on a second call within the 10-minute TTL.
- **[25]** Add `GET /api/v1/content/site|services|plans|faqs` — `permitAll`, `Cache-Control: public,
  max-age=300`.
  *Verify*: integration test per endpoint, all four locales, asserts headers and shape; p95 latency
  assertion deferred to Phase 19's performance pass.
- **[26]** Add `GET /api/v1/locales` and `GET /api/v1/i18n/{locale}.json` — the latter backed by an
  (initially empty) `uiTranslationOverrides` collection.
  *Verify*: `/locales` returns 4 entries with display names; `/i18n/xx.json` returns `{}` until
  Phase 7 adds override writes.
- **[27]** Wire the Spring Security filter chain (§7.7): public `GET content/i18n/locales/health`
  and `POST enquiries` permit-all, everything under `/api/v1/admin/**` authenticated, `STATELESS`
  session, HSTS.
  *Verify*: integration test: an admin path with no token → 401; public paths → 200 with no
  `Set-Cookie` at all (this satisfies R8 at the API layer — the frontend's functional locale cookie
  is set client-side, not by this response).
- **[28]** Add response security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) per the
  exact §13.2 CSP value.
  *Verify*: integration test asserts each header, byte-for-byte on the CSP.

### Phase 4 — Enquiry intake

- **[29]** Add `EnquiryRequest` DTO with Bean Validation (§7.4), `enquiries` collection, TTL index
  on `retentionExpiresAt` (24 months, §8.2/§13.3).
  *Verify*: unit test: malformed phone/email → 400 with field-level errors.
- **[30]** Add `POST /api/v1/enquiries`: persist, generate the `ENQ-YYYY-NNNNNN` reference, `201`.
  *Verify*: integration test posts a valid enquiry, asserts `201` + reference format + DB row.
- **[31]** Add rate limiting (5/hour/IP), a honeypot field, and a minimum submission dwell time
  (§7.7/R-6).
  *Verify*: integration test: a 6th submission within an hour from one IP → `429`.
- **[32]** Hash IP before storage (never store raw IP); exclude the `message` field from logs,
  error reports and any export (§13.3 special-category data).
  *Verify*: unit test asserts `meta.ipHash` is not the literal IP; a log-capture test asserts
  `message` content never appears in a log line.
- **[33]** Add admin `GET /api/v1/admin/enquiries` (paginated/filterable) and
  `PATCH .../enquiries/{id}` — role checks land properly once Phase 5 exists; stub the role
  annotation now, verify in Phase 5's task 39.
  *Verify*: integration test without auth wiring: happy-path list/patch work; re-verified with real
  roles in task 39.
- **[34]** Add admin hard-delete + audit log entry (§13.3 erasure right).
  *Verify*: integration test deletes an enquiry, asserts it's gone and an `auditLog` row records it.

### Phase 5 — Admin identity & authentication

- **[35]** Add the `adminUsers` collection, `VIEWER|EDITOR|PUBLISHER|ADMIN` roles, `localeScope`,
  BCrypt strength 12.
  *Verify*: unit test hashes/verifies a password; a wrong password fails verification.
- **[36]** Add `POST /api/v1/admin/auth/login` — JWT access token (30 min) + refresh token (14
  days, rotated, stored hashed).
  *Verify*: integration test: valid creds → 200 with both tokens; invalid → 401.
- **[37]** Add lockout: 15 minutes after 5 failed attempts, tracked per username and per IP.
  *Verify*: integration test: 5 bad attempts, then a 6th with the *correct* password → still locked.
- **[38]** Add `POST /auth/refresh` (rotate) and `POST /auth/logout` (revoke).
  *Verify*: integration test: refreshing with an already-used refresh token → rejected.
- **[39]** Wire the JWT resource-server config and `@PreAuthorize` on service methods, not just
  controllers (§7.7); re-verify Phase 4 task 33's enquiry endpoints under real roles.
  *Verify*: integration test: an EDITOR token hitting a PUBLISHER-only endpoint → 403 even though
  the controller route matches; enquiry list/patch behave per role.
- **[40]** Enforce `mustChangePassword` on the bootstrap admin's first login — blocks all other
  admin actions until the password is changed.
  *Verify*: integration test: bootstrap login → any other admin call → 403 with a
  "change password required" problem type, until the password-change endpoint succeeds.
- **[41]** Add `GET /api/v1/admin/audit` (ADMIN only), filterable by entity/actor.
  *Verify*: integration test: non-admin → 403; admin → 200 with entries produced by earlier tasks'
  side effects (logins, lockouts).

### Phase 6 — Admin content CRUD, revisions, publishing

- **[42]** Add the generic content controller pattern for
  `services|plans|testimonials|faqs|sections|settings`: `GET` list (all locales + completeness)
  and `GET {id}` (VIEWER).
  *Verify*: integration test: `GET /admin/content/services` returns all 6 with per-locale
  `completeness` fractions from `LocalizedText.completeness()`.
- **[43]** Add `POST {type}` (EDITOR, creates `DRAFT`) and `PUT {type}/{id}` (EDITOR, writes a new
  revision via the Phase 2 revision helper).
  *Verify*: integration test: `PUT` twice, `GET .../revisions` shows 2 revisions, the earlier
  snapshot unchanged.
- **[44]** Add optimistic locking via `@Version`; a losing concurrent `PUT` gets `409` with the
  current state (E-9).
  *Verify*: integration test: two clients `PUT` from the same stale version; the second → 409.
- **[45]** Add `POST {type}/{id}/publish` (PUBLISHER): rejects if English is incomplete (E-6),
  otherwise sets `publishedRevisionId` and evicts `siteContent`+`i18nBundle` caches globally (§7.8).
  *Verify*: integration test: publish with incomplete English → 422 with an explanation; complete →
  200, and the next public `GET` reflects it immediately (no stale cache).
- **[46]** Enforce the testimonial consent gate on publish — `409` if `consent.obtained` is false
  (§8.2, R-5).
  *Verify*: integration test reproduces spec §11.3 journey 6 exactly.
- **[47]** Enforce the exactly-one-`featured`-plan invariant on publish (§8.5).
  *Verify*: integration test: publishing a second `featured: true` plan → rejected.
- **[48]** Add `POST {type}/{id}/unpublish` and `DELETE` (soft delete → `ARCHIVED`, PUBLISHER).
  *Verify*: integration test: an archived entity disappears from public `GET`, still visible in the
  admin list.
- **[49]** Add `POST {type}/{id}/reorder` (EDITOR, updates `displayOrder` across siblings).
  *Verify*: integration test reorders 3 services, asserts the public `GET` reflects the new order.
- **[50]** Add `GET .../revisions` and `POST .../revisions/{rev}/restore` (PUBLISHER).
  *Verify*: integration test reproduces spec §11.3 journey 8: edit, publish, restore, public site
  reverts.
- **[51]** Add the monthly revision-retention pruning job (latest 50 + every published revision,
  §8.2).
  *Verify*: unit test seeds 60 unpublished revisions, runs the job, asserts 50 remain plus any
  published ones regardless of count.
- **[52]** Add `POST /admin/media` (multipart; extension + magic-byte allow-list; 8 MB cap;
  EXIF-stripping re-encode; thumb/medium/full variants; `blurHash`) and `GET /admin/media`
  (paginated library).
  *Verify*: integration test uploads a JPEG, asserts 3 variants, a `blurHash`, and an initially
  empty `referencedBy`.
- **[53]** Add `DELETE /admin/media/{id}` — refused while `referencedBy` is non-empty — and an
  orphan report query (R-9).
  *Verify*: integration test: delete a referenced image → 409; delete an orphan → 200.

### Phase 7 — Admin i18n overrides

- **[54]** Add `GET`/`PUT /admin/i18n/{locale}` (VIEWER/EDITOR, writes `uiTranslationOverrides`)
  and `DELETE .../{locale}/{key}` (reverts to the shipped default, §9.4 T-3/T-4).
  *Verify*: integration test: `PUT` an override, public `GET /api/v1/i18n/{locale}.json` reflects
  it; `DELETE` reverts to `{}`.
- **[55]** Add `GET /admin/i18n/coverage` — missing-key report across all locales, cross-referenced
  against the shipped JSON files' key set (§9.4 T-7).
  *Verify*: integration test with a deliberately incomplete locale file returns the expected
  missing-key list.

### Phase 8 — Backend coverage gate

- **[56]** Raise the JaCoCo threshold from 70% to 80% line coverage on service packages (§11.1).
  *Verify*: `./mvnw verify` fails on regression, passes on current state.
- **[57]** Add one full round-trip integration test per spec §11.3 journey not already covered by a
  dedicated task (journeys 3, 4, 5, 7 — no-auth-on-public-routes, editorial round trip, translation
  fallback, rate limiting), each end-to-end against Testcontainers Mongo.
  *Verify*: all pass in isolation and as part of the full suite.
- **[58]** Wire `./mvnw verify` as the single "everything green" backend command; fill in
  `CONTRIBUTING.md`'s placeholder from task 4.
  *Verify*: fresh clone, `docker compose up -d mongo`, `./mvnw verify` passes with no manual steps.

### Phase 9 — Angular workspace bootstrap

- **[59]** Scaffold `web/` as Angular 22, standalone + zoneless
  (`provideZonelessChangeDetection()`), SSR enabled (`@angular/ssr`), per §5.1.
  *Verify*: `ng serve` and `npm run build:ssr && npm run serve:ssr` both render the default shell.
- **[60]** Generate the Material 3 theme from the brand hexes (`ng generate
  @angular/material:theme-color --primary-color "#0D3058" --tertiary-color "#C59437"`); commit the
  generated palette and apply the hand-written `--mat-sys-*` overrides from §5.2.
  *Verify*: a `mat-button` renders navy/gold, not the M3 default purple.
- **[61]** Wire Tailwind 4 per the exact §5.3 integration contract: Preflight omitted, explicit
  `@layer tailwind-theme, material, tailwind-utilities` ordering, `@source` scoping (not scanning
  `node_modules`), and `brand.css` deriving Tailwind's `--color-*` from `--mat-sys-*`.
  *Verify*: a component using both a Material button and a Tailwind utility (`class="mt-4 flex
  gap-2"`) renders correctly with no clobbering either direction; a visual regression test locks
  this in (feeds Phase 16's screenshot suite).
- **[62]** Add Transloco (`provideTransloco`) with the config from §5.1: `availableLangs`,
  `fallbackLang: en`, `reRenderOnLangChange: true`, `missingHandler` per dev mode.
  *Verify*: switching `LocaleService.current()` re-renders translated strings without a reload.
- **[63]** Add routing (§5.4): locale-prefixed public routes (`/`, `/es`, `/fr`, `/de`) via
  `localeRouteMatcher`, lazy-loaded `/admin` behind `adminShellGuard`, and a 404 route.
  *Verify*: `/xx` (unsupported code) still resolves to the 404 route, not a broken locale match.

### Phase 10 — Angular core services

- **[64]** Add `ContentApi` and `SiteContentStore` (`rxResource`-backed, §5.5) exposing `content`,
  `services`, `plans`, `stories`, `faqs`, `loading` as computed signals.
  *Verify*: changing `LocaleService.current()` triggers exactly one re-fetch; every section reads
  from the same store.
- **[65]** Add `LocaleService` implementing the §10.4 resolution order (path prefix → cookie →
  `Accept-Language` → `en` default), writing the one-year functional cookie, updating `<html lang>`.
  *Verify*: unit test covers all four resolution branches in priority order.
- **[66]** Add `TranslocoHttpLoader` implementing the §10.3 deep-merge (shipped JSON defaults +
  `GET /api/v1/i18n/{locale}.json` overrides, override wins, API failure falls back to defaults
  only — "the site renders without the API").
  *Verify*: unit test: API call errors → loader still resolves with the shipped bundle; override
  present → override value wins over the default for that key.
- **[67]** Register additional Angular locale data (`es`/`fr`/`de`) at bootstrap for `DatePipe`/
  `CurrencyPipe`; implement the §10.5 per-locale price formatting (`GHS` fixed, format varies).
  *Verify*: unit test asserts the four §10.5 table renderings for `GH₵5,000.00` exactly.
- **[68]** Add `SeoService` (§6.3): title, meta description, OG/Twitter tags, canonical,
  `hreflang` alternates for all four locales + `x-default`, and `MedicalBusiness`/`Service`/
  `Offer`/`FAQPage` JSON-LD, all sourced from `SiteContentStore`.
  *Verify*: SSR-rendered HTML for each locale contains the correct `hreflang` set and valid JSON-LD
  (schema-validated).
- **[69]** Add the admin-only auth token store, `authInterceptor`, and `adminShellGuard`
  (`canMatch`) so the `/admin` chunk never loads for a public visitor.
  *Verify*: bundle analysis confirms `/admin` is a separate lazy chunk; a public page load's network
  log contains no request for it.

### Phase 11 — `BrandCarousel` shared component

- **[70]** Build `BrandCarousel<T>` per the §6.1 API (`items`, `autoplayMs`, `label`, `slide`
  content-child template; `index`/`count`/`offset` signals; `next`/`prev`/`goTo`).
  *Verify*: renders slides from arbitrary fixture data via the `slide` template.
- **[71]** Implement and test every behavioural requirement C-1 through C-9 from §6.1/§11.2 as
  individual test cases: wraparound, single `aria-current`, autoplay pause/resume on
  hover/focus/`document.hidden`, restart-on-interaction, arrow-key nav with `stopPropagation`,
  swipe threshold (45 px), off-screen `aria-hidden`/`tabindex="-1"`, `prefers-reduced-motion`
  disabling autoplay and transitions, and timer cleanup on `fixture.destroy()`.
  *Verify*: the §11.2 test matrix passes in full — nine green tests, one per requirement ID.
- **[72]** Guard autoplay from running during SSR (`afterNextRender()`); manage the timer via
  `effect()` + `DestroyRef`.
  *Verify*: SSR-rendered HTML contains no client-only timer side effects; hydration doesn't
  double-start autoplay.

### Phase 12 — Public site section components

Each is `ChangeDetectionStrategy.OnPush`, reads only from `SiteContentStore` (§6 table).

- **[73]** Shell + nav cluster: `DemoNoticeBar` (compiled out via `environment.isDemo`),
  `TopContactStrip`, `SiteHeader` (sticky nav + scroll-spy, `mat-menu` mobile drawer),
  `LanguageSwitcher` — **two-letter code buttons (`EN` `ES` `FR` `DE`), not the `mat-select` the
  spec's §6 table specifies, and not flags.** Client decision, 2026-07-26; the reasoning is in
  CONTRIBUTING.md under "Deliberate departures from the spec". Do not revert either way.
  *Verify*: scroll-spy highlights the active section; the switcher navigates to the correct
  locale-prefixed path **and back to English**, which is the case that regressed (journey 2b).
- **[74]** `HeroSection` (LCP element — preloaded, `fetchpriority="high"` hero image per §13.1) and
  `AssuranceBar`.
  *Verify*: Lighthouse/`web-vitals` LCP element is confirmed to be the hero image, not a later
  paint.
- **[75]** `ServicesCarousel` (uses `BrandCarousel`), `ProcessSteps`, `ApproachSection`.
  *Verify*: carousel slide count matches the 6 seeded services; process steps render in
  `displayOrder`.
- **[76]** `StatsBand`, `AngelNetworkSection`.
  *Verify*: content matches the seeded `sections` documents for `stats`/`angel`.
- **[77]** `PricingSection` (3 plan cards) and `PricingTable` (feature comparison), both derived
  from the same `plans` array — assert they can never disagree since they share one data source.
  *Verify*: unit test: changing a fixture's `plans` array updates both components identically.
- **[78]** `TestimonialsCarousel` (uses `BrandCarousel`), `FaqSection` (`mat-accordion`).
  *Verify*: 4 testimonial slides; FAQ accordion groups match seeded `category` values.
- **[79]** `CtaBand`, `ContactSection` (Material form controls, wired to `ContentApi.submitEnquiry`,
  client-side validation mirroring the backend's Bean Validation rules), `SiteFooter`.
  *Verify*: submitting the contact form with a valid payload returns the `ENQ-...` reference and
  shows a confirmation state; footer service links are derived from `services`, not hardcoded.

### Phase 13 — Accessibility, i18n formatting, and CI checks

- **[80]** Implement the §6.2 accessibility requirements across all components: landmarks, skip
  link, focus rings, `aria-describedby`/`role="alert"` on form errors, `<html lang>` updates,
  44×44 px targets, `prefers-reduced-motion` respected everywhere (not just the carousel).
  *Verify*: axe-core run against every public route in all four locales reports zero serious/
  critical violations (feeds Phase 16).
- **[81]** Implement ICU pluralisation (§10.6) for any UI string whose value varies with a count
  (`services.slideCount`, `faq.resultCount`); ban string-concatenation plurals in review.
  *Verify*: unit test asserts French (`one` covers 0 and 1) and German (`one` covers only 1) render
  differently for `count: 0`.
- **[82]** Write `scripts/check-i18n.mjs` per §11.5: key-set parity across all four locale files, no
  empty-string values, matching interpolation placeholders, plural-syntax parity, UTF-8/alphabetical
  ordering.
  *Verify*: script fails on a deliberately broken fixture (missing key, empty value, mismatched
  `{{ name }}` vs `{{ nom }}`) and passes on the real `web/public/i18n/*.json`.

### Phase 14 — Admin CMS UI

- **[83]** Build `/admin/login` and the auth flow (token store from Phase 10 task 69), including the
  forced password-change screen for `mustChangePassword` (matches backend task 40).
  *Verify*: bootstrap admin login is redirected to the change-password screen and cannot navigate
  away until it succeeds.
- **[84]** Build the dashboard (`/admin`): publication state (DRAFT > 7 days highlighted),
  translation coverage bars linking into the filtered translation workspace, new-enquiries count,
  last-20 audit entries, health/cache-hit-ratio (§9.6).
  *Verify*: seeding a DRAFT entity 8 days old shows the highlight; each widget's number matches a
  direct API query.
- **[85]** Build the content editor pattern (§9.3): locale tab strip with ✓/⚠/○ glyphs (E-1),
  English source shown read-only under non-English fields (E-2), `CanDeactivate` unsaved-changes
  guard (E-4), CDK `DragDrop` reordering for bullets/features/items (E-7), a live preview panel
  rendering the actual public component (E-8, not an approximation).
  *Verify*: each of E-1 through E-8 has a corresponding component test; the preview panel and the
  public site render identically from the same fixture data.
- **[86]** Wire the editor to the six content types (`sections`, `services`, `plans`,
  `testimonials`, `faqs`, `settings`); surface the E-9 optimistic-locking conflict as a diff view;
  surface E-6/E-10 (publish blocked on incomplete English / missing consent) as explanatory,
  not-just-a-toast, UI.
  *Verify*: triggering a 409 (concurrent edit) or 422 (incomplete English)/409 (missing consent)
  from the backend renders the specific explanation, not a generic error.
- **[87]** Build the translation workspace (§9.4): one row per field across all content types plus
  every UI string key, missing-only filter with a live coverage bar, `[DEF]` marker with one-click
  revert, export/import with a diff preview before applying (T-1 through T-7).
  *Verify*: exporting a locale and re-importing it unchanged produces an empty diff; importing a
  file with 3 changed values previews exactly those 3 as a diff before commit.
- **[88]** Build the media library (`/admin/media`): upload, per-locale alt text, usage report,
  delete-blocked-while-referenced (mirrors backend tasks 52-53).
  *Verify*: attempting to delete a referenced image shows the referencing entities, not just a
  generic failure.
- **[89]** Build the enquiries inbox (`/admin/enquiries`): status workflow, notes, and `/settings`
  (contact details, hours, SEO defaults).
  *Verify*: changing an enquiry's status persists and is reflected in the dashboard's new-count.
- **[90]** Build `/admin/users` and `/admin/audit`, both ADMIN-only routes (guard tested, not just
  hidden nav).
  *Verify*: navigating directly to `/admin/users` as a non-ADMIN role is blocked by the route guard,
  not merely absent from the nav menu.

### Phase 15 — Frontend coverage gate

- **[91]** Set Vitest coverage thresholds (≥75% on components/services, §11.1); add component
  tests (`TestBed` + harnesses) for all 18 public section components — one "renders from fixture"
  and one "responds to interaction" test each, per §11.1's coverage-is-a-floor principle (assert
  *what* renders, not just that it renders).
  *Verify*: `npm run test -- --coverage` passes threshold; one spec file per component from Phase 12
  and Phase 14, all green.

### Phase 16 — End-to-end tests (Playwright)

- **[92]** Scaffold Playwright against the full `docker compose up` stack (mongo + api + web).
  *Verify*: a trivial "homepage loads" spec passes headless.
- **[93]** Journey 1 — browse and convert: load home, page the services carousel, open two FAQ
  items, submit the enquiry form, assert confirmation + a MongoDB document exists.
- **[94]** Journey 2 — locale switch: `es`/`fr`/`de`, assert `<html lang>`, nav labels, §10.5 price
  formatting, `hreflang` alternates.
- **[95]** Journey 3 — no auth on the public site: crawl every public route, assert no password
  input, no sign-in link, no `Set-Cookie` beyond the functional locale cookie (guards R8).
- **[96]** Journey 4 — editorial round trip: sign in EDITOR, change a Spanish blurb, save, publish,
  reload the public Spanish page, assert the new text.
- **[97]** Journey 5 — translation fallback: remove a German field, assert the public German page
  shows English text, never an empty element or a raw key.
- **[98]** Journey 6 — consent gate: attempt to publish a testimonial with `consent.obtained: false`,
  assert `409` and the entity stays `DRAFT`.
- **[99]** Journey 7 — rate limiting: submit six enquiries from one IP within an hour, assert the
  sixth is rejected with `429`.
- **[100]** Journey 8 — revision rollback: edit, publish, roll back, assert the public site reverts.
  *Verify* (93–100): each spec passes headless and is traceable back to its spec §11.3 journey number.
- **[101]** Wire axe-core into the Playwright run against every public route × all four locales and
  the main CMS screens; fail the build on any serious/critical violation (§6.2/§11.4).
- **[102]** Add visual-regression screenshots: home page at three viewports × four locales (§11.1),
  covering the Tailwind/Material integration risk from task 61.
  *Verify* (101–102): CI fails on an intentionally introduced contrast regression or a Material
  style clobbered by a reintroduced Tailwind Preflight import.

### Phase 17 — Dockerization & local full-stack compose

- **[103]** Add `api/Dockerfile` per §12.3: Maven build stage → `eclipse-temurin:25-jre-alpine`
  runtime, non-root user, `-XX:+UseZGC`, `HEALTHCHECK` against `/actuator/health/readiness`.
  *Verify*: `docker build -t abofonsa-api api/` succeeds; container serves health at `:8080`.
- **[104]** Add `web/Dockerfile`: Node build stage (Angular SSR) → Node runtime behind nginx,
  non-root, read-only root filesystem, no extra capabilities.
  *Verify*: `docker build -t abofonsa-web web/` succeeds; container serves SSR HTML on port 80.
- **[105]** Wire root `docker-compose.yml`'s `api`/`web` services to these Dockerfiles with
  `depends_on`/healthcheck ordering (Mongo replica set healthy before `api` starts).
  *Verify*: `docker compose up` from a clean state brings up all three services; the homepage is
  reachable with live (non-fixture) content in all four locales.

### Phase 18 — CI pipeline

- **[106]** Backend CI job: `mvn verify` (unit + Testcontainers integration) + OWASP
  dependency-check (fail on CVSS ≥ 7).
- **[107]** Frontend CI job: `npm ci && npm run lint && npm run test`, then
  `node scripts/check-i18n.mjs`, then `npm run build` with a bundle-size assertion (<220 KB
  gzipped initial JS, excluding the `/admin` chunk — §13.1).
- **[108]** E2E CI job: `docker compose up -d --build` then the full Playwright suite (Phase 16)
  against it, torn down after.
  *Verify* (106–108): each job is independently red/green — intentionally breaking the consent gate
  (task 46) fails only the backend and e2e jobs, not the frontend job, proving job isolation.
- **[109]** Add the main-branch pipeline: build/push `docker.jojoaddison.net/abofonsa-{api,web}:${SHA}`,
  deploy to staging, smoke test, manual-approval gate before production (§12.2).
  *Verify*: a merge to `main` produces both images tagged with the commit SHA and stops at the
  approval gate without deploying further.
- **[110]** Document branch protection (all CI jobs required before merge) in `CONTRIBUTING.md` as
  a manual repo-settings follow-up, not a code task (mirrors `hc-crowdfund-app`'s equivalent note).

### Phase 19 — Non-functional hardening

- **[111]** Enforce the §13.1 performance budget in CI: AVIF/WebP/JPEG `<picture>` pipeline with
  `srcset`, `loading="lazy"` + `blurHash` placeholders on every non-hero image, system-font-only
  stack (no web font download).
  *Verify*: Lighthouse CI (Slow 4G, mid-range Android profile) meets LCP < 2.0 s, CLS < 0.05, INP <
  200 ms.
- **[112]** Add Micrometer → Prometheus metrics (request rate, latency percentiles, cache hit ratio,
  Mongo pool saturation, JVM memory) and structured JSON logging with a correlation id propagated
  via Java 25 scoped values, echoed as `X-Request-Id` (§13.5).
  *Verify*: a request's `X-Request-Id` appears in the corresponding log line; no personal data
  appears in any log line (grep-based CI check against a fixture request containing an email/phone).
- **[113]** Document the §13.5 alert thresholds (5xx rate, p95 latency, replica lag, failed logins)
  as config-as-code or a runbook, plus the external uptime check against `/api/v1/health` and the
  rendered home page.
  *Verify*: alert rules exist in version control (not just described); a deliberate `/health`
  failure trips the configured rule in a staging test.

### Phase 20 — Production deployment

Follows the conventions established by `hc-crowdfund-app` (`../hc-crowdfund-app/infra/PRODUCTION_DEPLOYMENT_PLAN.md`),
adapted for MongoDB in place of Postgres/Kafka. Steps below that touch the live server are
higher-risk (DNS-facing TLS issuance, dropping any pre-existing placeholder data) — confirm
immediately before executing them even after this plan is approved overall, same as that
document's own stated practice.

- **[114]** Add `infra/prod-server/compose.yml`: `name: hc-abofonsa` pinned explicitly; `mongo`,
  `api`, `web` services on the external `abofonsanet` network; `api` additionally joins the
  external `monitoring` network; container names `hc_abofonsa_{mongo,api,web}`; `web` publishes
  `127.0.0.1:${FRONTEND_PORT:-8082}:80` only (loopback).
  *Verify*: `docker compose config` resolves cleanly against a filled `.env`.
- **[115]** MongoDB replica set in production: single-node `mongo` service with a `command`
  enabling `--replSet`, plus a one-shot init step (entrypoint script or a short-lived `mongo-init`
  container) running `rs.initiate()` idempotently on first boot only.
  *Verify*: `docker exec hc_abofonsa_mongo mongosh --eval "rs.status()"` shows `PRIMARY`; restarting
  the stack doesn't re-run `rs.initiate()` against an already-initialized set.
- **[116]** Add the OTel Java agent to `api/Dockerfile`'s runtime stage (pinned version, same
  release used by `hc-crowdfund-app`'s plan — `v2.9.0` at time of writing, re-verify current), with
  `JAVA_TOOL_OPTIONS`/`OTEL_*` env vars set only in `infra/prod-server/compose.yml` (opt-in per
  deployment, no-op in dev/local compose).
  *Verify*: traces for `hc-abofonsa-api` appear in the shared Grafana/Tempo stack after a test
  request; local `docker compose up` (Phase 17) is unaffected.
- **[117]** Add `infra.sh` (creates `abofonsanet`, named volumes), `start`
  (`docker compose up -d --remove-orphans --force-recreate`), and `backup.sh` (nightly `mongodump`,
  gzip, 14-day retention — this server has no prior Mongo backup convention, so this establishes
  one, matching how `hc-crowdfund-app` added the first Postgres one).
  *Verify*: a manual `backup.sh` run on staging produces a restorable `.gz` archive.
- **[118]** Add `infra/prod-server/nginx-abofonsa.conf` for `www.abofonsa.com` (+ apex redirect):
  HTTP-only bootstrap block proxying to `127.0.0.1:8082`, matching the pattern of the other
  `sites-available/*.conf` files on that host.
  *Verify*: `nginx -t` passes with the file staged; matches the structure of `ndua.conf`/
  `bedrock.conf` referenced in `hc-crowdfund-app`'s plan.
- **[119]** **Server** — create the network (`infra.sh`), ship `compose.yml` and a freshly generated
  `.env` (new random `JWT_SIGNING_KEY` ≥ 256-bit, Mongo credentials, `BOOTSTRAP_ADMIN_PASSWORD`,
  mode 600) to `~/webroot/01-healthconnect/abofonsa/`, `pull` + `./start`.
  *Verify*: `curl 127.0.0.1:8082/` and `127.0.0.1:8082/api/v1/content/site?locale=en` return 200
  from the server itself.
- **[120]** **Server** — nginx bootstrap (`nginx -t`, reload), then
  `certbot --nginx -d www.abofonsa.com -d abofonsa.com`.
  *Verify*: `https://www.abofonsa.com/` and `.../api/v1/content/site` return 200 over TLS; HTTP
  redirects to HTTPS.
- **[121]** **Server** — append `backup.sh` to root's crontab (`0 2 * * *`, alongside the existing
  `cert-renewal.sh` entry); confirm one real overnight run produces a `.gz` file.
- **[122]** Update `CONTRIBUTING.md` with a link to this runbook and the server path, so a future
  deploy doesn't require re-deriving any of it (mirrors `hc-crowdfund-app`'s equivalent closing
  step).

### Phase 21 — Go-live checklist

Ties back to spec §14.2's decisions requiring client confirmation — each of these was built to a
documented *default*; confirm before removing the "placeholder" framing in production content.

- **[123]** Confirm the domain (`www.abofonsa.com` was assumed from spec §8.2 example data, not
  independently confirmed — verify before task 120's `certbot` step, since that step is
  effectively irreversible against the live domain without a support ticket).
- **[124]** Confirm real consent evidence for the four testimonials seeded in task 17, or replace
  them before removing the demo banner (task 73's `environment.isDemo` flag).
- **[125]** Confirm the 24-month enquiry retention period, GHS-only pricing, and no email-forwarding
  of enquiries are still the intended production behaviour (all spec §14.2 defaults, all already
  built to that default — this is a confirm-or-change checkpoint, not a build task).
- **[126]** Rotate `BOOTSTRAP_ADMIN_PASSWORD` immediately after first production login (enforced by
  task 40's `mustChangePassword` gate — this item confirms it was actually done, not just that the
  gate exists).
- **[127]** Schedule the first quarterly backup-restore test (§12.4 requires this cadence; task 117
  only proves a backup *can* be taken, not that it restores cleanly).

---

## Related plans

- **[`careers-plan.md`](careers-plan.md)** — bringing healthcare professionals to the platform.
  Covers the "come with us" stage on this site only; the onboarding itself lives in
  `hc-professional` (`professional.abofonsa.com`). Continues the task numbering from this plan at
  128. Enrolment policy and recruited roles settled 2026-07-28; ready to build.

## Open items (revisit later, not blocking this plan)

- Annual penetration testing before any expansion into patient-facing functionality (spec §13.2) —
  not part of this build, flagged for the client to schedule separately.
- A fifth locale is explicitly accommodated by the schema (§14.2 #5) but not built — add a
  Mongock changelog + `i18n/{locale}.json` + CI check update only if/when requested.
- Object storage for media (currently local filesystem, spec §14.2 #6 default) — revisit if the
  media library outgrows a single host or a CDN becomes necessary for the diaspora audience.
- CI/CD automation for the production deploy itself (Phase 20 stays a manual runbook, matching
  every other app on `webserver` today) — revisit only if deploy frequency increases enough to
  justify it.
