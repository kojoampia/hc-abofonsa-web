# Contributing

## Prerequisites

- Java 25 (LTS) — `<maven.compiler.release>25` is enforced in `api/pom.xml`; do not build with an
  older JDK. No `--enable-preview` flag is used anywhere (structured concurrency stays preview-only
  in Java 25 and must not ship).
- Node 22+, npm 10+
- Docker + Docker Compose

## Local stack

```bash
docker compose up -d mongo   # MongoDB 8.3 single-node replica set (host port 27018)
docker compose up -d --build # the whole stack: mongo + api (:8080) + web (:4000)
```

The full stack is what the Playwright suite runs against. The `web` container serves the Angular
SSR app on port 4000 **and proxies `/api` and `/media` to the API**, so everything is reachable
from one origin at <http://localhost:4000> — the same shape nginx presents in production, which
means relative URLs work identically in `ng serve`, compose, and on the server.

Both application containers run as a non-root user with a read-only root filesystem, all
capabilities dropped, and `no-new-privileges`. `api` writes only to the `media-data` volume and a
tmpfs `/tmp`; if you add a code path that writes elsewhere on disk, it will fail here before it
fails in production.

If a build fails with `Temporary failure in name resolution` while fetching Maven or npm packages,
that is BuildKit DNS, not this project — both build stanzas already set `network: host` as the
workaround (the same one `hc-crowdfund-app`'s `deploy.sh` documents).

## Test commands

<!-- Filled in as each phase of plan.md lands its tooling. -->

| Module | Command | Status |
|---|---|---|
| Backend | `cd api && ./mvnw verify` | **The single backend "everything green" command** (plan task 58): unit + Testcontainers integration tests, JaCoCo 80% line-coverage gate, Spotless formatting. Requires Docker running and `JAVA_HOME` pointed at a JDK 25 install if your default `java` differs. From a fresh clone: `docker compose up -d mongo` is *not* needed — tests provision their own MongoDB via Testcontainers. |
| Frontend unit | `cd web && npm test -- --coverage` | Added in plan.md Phase 15 (task 91) |
| Frontend lint | `cd web && npm run lint` | angular-eslint. Added in plan.md Phase 18 (task 107) — the Phase 9 scaffold never actually wired a lint target, so this table previously promised a command that did not exist. Component/directive selectors are checked against the `abc` prefix, not the schematic default `app`. |
| i18n key-parity check | `node web/scripts/check-i18n.mjs` | Added in plan.md Phase 13 (task 82) |
| E2E (Playwright) | `cd web && npm run e2e` | Added in plan.md Phase 16. Needs the full stack up (`docker compose up -d --build --wait`). `npm run e2e:update-snapshots` regenerates visual baselines — review the image diff before committing one. |
| Performance budget | `cd web && npm run build -- --stats-json && npm run check-bundle-size` | Added in plan.md Phase 18 (task 107). Fails over 220 kB gzipped initial JS, or if any CMS code reaches the initial bundle (spec §13.1). |
| Dependency vulnerabilities | `cd api && ./mvnw verify -Psecurity` | Added in plan.md Phase 18 (task 106). Fails on CVSS >= 7. Behind a profile because it downloads the NVD database; set `-Dnvd.api.key=...` or expect it to be slow. |

## Toolchain deviations from the technical spec (found during implementation)

The spec (`Abofonsa_BridgeCare_Technical_Specification.md`) was written assuming library versions
current as of its writing date; a few don't hold up against what's actually resolvable/working
today. Each is called out where it matters in code comments; summarized here for anyone starting
fresh:

- **Mongock is not used.** The latest release (5.5.1) has no Spring Data MongoDB 5.x driver
  adapter (Spring Boot 4.1 ships Spring Data MongoDB 5.1.0; Mongock tops out at a v4 adapter, i.e.
  Boot 3-era). `api/src/main/java/.../migration/` implements an equivalent ordered, idempotent
  changelog runner instead — same contract (V001, V002, ... tracked in a `schemaMigrations`
  collection), just not the literal library.
- **Spring Boot 4.1's health SPI moved packages.** `org.springframework.boot.actuate.health.*`
  (what the spec's code samples reference) is now `org.springframework.boot.health.*`.
- **`TestRestTemplate` is gone.** Integration tests use `RestTestClient`
  (`org.springframework.test.web.servlet.client`), Spring Framework 7's WebTestClient-style fluent
  HTTP test client. See `api/src/test/java/.../support/AbstractIntegrationTest.java`.
- **Mongo connection properties moved.** `spring.data.mongodb.uri`/`host`/etc. (what the spec's
  YAML samples use) no longer configure the `MongoClient` in Boot 4.1 — that's now
  `spring.mongodb.*`. `spring.data.mongodb.*` still exists but only for Spring Data-specific
  behaviour (`auto-index-creation`, field naming, GridFS).
- **Testcontainers 2.x, not 1.x** — the `junit-jupiter`/`mongodb` artifacts were renamed to
  `testcontainers-junit-jupiter`/`testcontainers-mongodb`; 1.21.x's bundled docker-java also
  couldn't negotiate this host's Docker API version.
- **The `web` container is a Node server on port 4000, not nginx on port 80** (plan task 104 says
  "Node runtime behind nginx ... port 80"). SSR *is* the Node process; putting nginx inside the
  same image would only proxy localhost to itself. nginx still fronts the stack — as the host's
  existing reverse proxy (Phase 20), terminating TLS and forwarding to this port, which is where it
  already lives for every other site on that server.
- **The API image builds from the repository root**, not from `api/`, because the i18n coverage
  report (§9.4 T-7) needs `web/public/i18n` on the classpath. Build it as
  `docker build -f api/Dockerfile .`; `docker build api/` will not work. The `abofonsa.i18n.dir`
  Maven property makes the location overridable, and the copy no-ops in an api-only checkout.

## Deliberate departures from the spec — do not "fix" these back

The section above lists places where the spec's *toolchain* assumptions no longer hold. These are
different: the spec is still buildable as written, and we chose not to. Each was decided with the
client and is settled. If you are reading the spec and about to make the code match it, read the
reason here first.

### The language chooser is two-letter code buttons, not a `mat-select`

**Spec §6 component table, row 4** specifies `mat-select`, and `plan.md` task 73 repeats it.
Superseded on 2026-07-26 at the client's explicit instruction: *"keep the 2-letter codes."*

`LanguageSwitcher` renders one button per locale — `EN` `ES` `FR` `DE` — with the active one
filled. Do not change it to a dropdown, and **do not change it to flags**, which is the tempting
alternative and the wrong one:

- **A flag is a country, not a language.** English, Spanish, French and German are each spoken
  across many countries. This site serves Ghanaian families and their relatives abroad; a Ghanaian
  visitor reading English is not represented by a British or American flag. Several of the
  available choices are also actively contentious, and none of that is a problem worth importing
  into a healthcare company's homepage.
- **Codes need no images**, which keeps them inside the §13.1 performance budget and out of the
  media pipeline entirely.
- **Accessibility is better**, not worse: each button carries the language's own endonym as its
  accessible name, so a screen reader announces "Español", not the letters "E S". The group is
  labelled "Change language" in the active language, the current locale is marked with
  `aria-current`, and the buttons meet the WCAG 2.2 24px minimum target.

The rationale also lives in the component's own header comment, so it is visible at the point of
change. Journey 2b in `web/e2e/journeys.spec.ts` drives these buttons by `data-testid="lang-<code>"`
and will fail if the markup goes back to a select.

## Branch protection and release settings

These are GitHub repo-settings actions. They cannot be automated from this codebase, and that is
deliberate for the approval gate — a protection rule that a workflow edit could remove is not a
gate. Someone has to do these by hand, once.

**Branch protection on `main`** — require these four checks to pass before merge:

- `Backend (mvn verify)`
- `Backend dependency vulnerabilities (CVSS >= 7 fails)`
- `Frontend (lint, test, i18n, build, budget)`
- `E2E (Playwright against docker compose)`

**Environments** (Settings → Environments), which `.github/workflows/release.yml` targets:

| Environment | Protection | Secrets | Variables |
|---|---|---|---|
| `staging` | none | `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`, `STAGING_PATH` | `STAGING_URL` |
| `production` | **Required reviewers** — this is spec §12.2's manual approval gate | `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_SSH_KEY`, `PRODUCTION_PATH` | `PRODUCTION_URL` |

**Repository secret**: `NVD_API_KEY` — free from <https://nvd.nist.gov/developers/request-an-api-key>.
Without it the dependency-check job still runs but is rate-limited to the point of timing out.

Until the environments exist, `release.yml` builds and pushes images to GHCR and then stops: the
deploy jobs have nothing to connect to. That is the intended state before Phase 20 provisions the
server, not a misconfiguration.

## Production deployment

**[`infra/PRODUCTION_DEPLOYMENT_PLAN.md`](infra/PRODUCTION_DEPLOYMENT_PLAN.md)** is the runbook —
first-time setup, secrets, TLS, backups, routine deploys and rollback. It deploys to `webserver` at
`~/webroot/01-healthconnect/abofonsa/`, following the same conventions as `../hc-crowdfund-app`.

The deployable files live in `infra/prod-server/` and are shipped **as-is**. A change made only on
the server is lost at the next deploy and never reviewed, so edits belong here.

| File | Purpose |
|---|---|
| `compose.yml` | The production stack: mongo (replica set), api, web. Loopback-only ports; host nginx owns TLS. |
| `.env.example` | Template for the server's `.env`. Generate the three secrets **on the server**. |
| `infra.sh` | One-time: creates the `abofonsanet` network. |
| `start` | Pull the tagged images and recreate the stack. Used by hand and by the release workflow. |
| `backup.sh` | Nightly `mongodump` **plus** the media volume — the two are useless apart. 14-day retention. |
| `nginx-abofonsa.conf` | Host nginx vhost (pre-certbot bootstrap; certbot rewrites it in place). |

Observability config that the shared monitoring stack consumes lives in `infra/observability/`:
Prometheus alert rules for all four spec §13.5 thresholds, and the blackbox uptime targets.

Routine releases are automated (`.github/workflows/release.yml`): merge to `main` → SHA-tagged
images → staging → smoke test → manual approval → production.

For a manual build or deploy, `./build.sh` and `./deploy.sh` at the repo root do the same work by
hand — same images, same `./start` script, so an automated deploy and a manual one cannot drift:

```bash
./build.sh                  # build + push both images, tagged with the current commit
./deploy.sh                 # build, ship config, restart, verify
./deploy.sh --verify-only   # touch nothing; just run the health and HTTP checks
TAG=<sha> ./deploy.sh --skip-build   # roll back to a previously pushed image
./deploy.sh --bootstrap --with-nginx --with-tls   # first-time install on a bare server
```

`--bootstrap` generates the three secrets by running `openssl rand` **on the server**, so they
never exist locally or on the wire. Every mutating step announces itself and prompts; certbot
prompts even under `--yes`, because it is rate-limited and publishes the hostname to public
Certificate Transparency logs.
