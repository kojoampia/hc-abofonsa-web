# Abofonsa BridgeCare — Health Connect

Public marketing site + mini CMS for Abofonsa BridgeCare, built per
`Abofonsa_BridgeCare_Technical_Specification.md` and reproducing
`Abofonsa_BridgeCare_Website.html` section-for-section. See `plan.md` for the phased
implementation plan this repository is being built against.

## Repository layout

```
├── web/            # Angular 22 SSR application (public site + lazy-loaded /admin CMS)
├── api/             # Spring Boot 4.1 (Java 25) REST API
├── docker-compose.yml   # MongoDB 8.3 replica set + api + web, local dev
└── infra/prod-server/   # versioned copy of what's deployed on webserver (see plan.md Phase 20)
```

## Local development

```bash
docker compose up -d mongo          # MongoDB 8.3 single-node replica set, seeded via Mongock on API start
cd api  && ./mvnw spring-boot:run   # http://localhost:8080
cd web  && npm start                # http://localhost:4200, proxied to :8080
```

Run everything (including the built images) with `docker compose up`.

## Design/content reference (not edited by the build)

- `Abofonsa_BridgeCare_Website.html` — approved prototype; visual and content design source of truth
- `Abofonsa_BridgeCare_Demo.html` — earlier demo variant, reference only
- `site_assets.json`, `brand.png` — asset reference. `brand.png` is the workspace-wide convention:
  every product repo keeps one, and the navy `#0d3058` / gold `#c59437` palette is derived from it.
  It replaces `abofonsa-logo-original.png`, which was the same badge at 5.7 MB.
- `Abofonsa_BridgeCare_Technical_Specification.md` — the technical specification this build implements
