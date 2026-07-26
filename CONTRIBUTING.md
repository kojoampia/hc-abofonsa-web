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
| Frontend lint | `cd web && npm run lint` | Added in plan.md Phase 9 |
| i18n key-parity check | `node web/scripts/check-i18n.mjs` | Added in plan.md Phase 13 (task 82) |
| E2E (Playwright) | `cd web && npx playwright test` | Added in plan.md Phase 16 |

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

## Branch protection

Once the CI jobs in plan.md Phase 18 (backend, frontend, e2e) are green on `main`, enable branch
protection requiring all three to pass before merge. This is a GitHub repo-settings action, not
something automatable from this codebase — a manual follow-up, not a CI task.

## Production deployment

See `plan.md` Phase 20 and (once added) `infra/prod-server/` for the runbook deploying to
`webserver` (`~/webroot/01-healthconnect/abofonsa/`), following the same conventions as
`../hc-crowdfund-app`.
