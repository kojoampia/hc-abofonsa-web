# Abofonsa BridgeCare — Health Connect

## Technical Specification: Public Website & Content Management System

| | |
|---|---|
| **Document** | Technical Specification v1.0 |
| **System** | Abofonsa BridgeCare Health Connect — public marketing site + mini CMS |
| **Client** | Abofonsa BridgeCare, Accra, Ghana |
| **Prepared for** | jojoaddison — Information Systems Consulting |
| **Date** | 25 July 2026 |
| **Status** | For review |
| **Audience** | Full-stack engineers, DevOps, technical lead |

---

## Table of contents

1. [Introduction and scope](#1-introduction-and-scope)
2. [Solution overview](#2-solution-overview)
3. [Technology stack](#3-technology-stack)
4. [Repository layout](#4-repository-layout)
5. [Frontend — Angular 22, Material 3, Tailwind 4](#5-frontend--angular-22-material-3-tailwind-4)
6. [Component inventory](#6-component-inventory)
7. [Backend — Spring Boot 4.1 on Java 25](#7-backend--spring-boot-41-on-java-25)
8. [Data model — MongoDB](#8-data-model--mongodb)
9. [Content Management System](#9-content-management-system)
10. [Internationalisation](#10-internationalisation)
11. [Testing strategy](#11-testing-strategy)
12. [Build, CI/CD and deployment](#12-build-cicd-and-deployment)
13. [Non-functional requirements](#13-non-functional-requirements)
14. [Risks and decision log](#14-risks-and-decision-log)
15. [Appendices](#15-appendices)

---

## 1. Introduction and scope

### 1.1 Purpose

This document specifies the implementation of the Abofonsa BridgeCare public website as a
production system. The visual and content design is already fixed by the approved
single-file prototype (`Abofonsa_BridgeCare_Website.html`); this specification describes how
to rebuild that experience as a maintainable Angular application backed by a Spring Boot
service and MongoDB, with a lightweight CMS so that non-technical staff can edit every piece
of copy in four languages.

### 1.2 In scope

| Ref | Requirement |
|---|---|
| **R1** | Faithful reproduction of the approved public website, section for section |
| **R2** | Angular 22 SPA using Angular Material 3 components and Tailwind CSS 4 utilities |
| **R3** | Spring Boot 4.1 REST API running on Java 25 |
| **R4** | All content persisted in MongoDB — no content hard-coded in the frontend |
| **R5** | Mini CMS at `/admin`, authenticated, for managing content in a multilingual context |
| **R6** | Four locales: English (default), Spanish, French, German |
| **R7** | JSON translation files supply default UI translations for `es`, `fr`, `de` |
| **R8** | Public site requires no sign-in, sign-up or account of any kind |
| **R9** | Consultation enquiries captured and stored; no patient clinical data collected |

### 1.3 Out of scope

Patient portal, booking, telemetry ingestion, billing, the caregiver mobile applications and
the Kafka duty-roster engine described in the storyboard. Those belong to the Health Connect
platform proper; this project delivers only the public website and its CMS. The API is
namespaced (`/api/v1/...`) so that the platform services can be added later behind the same
gateway without collision.

### 1.4 Definitions

| Term | Meaning |
|---|---|
| **Locale** | A supported language: `en`, `es`, `fr`, `de` |
| **Content entity** | Editorial data managed in the CMS (services, plans, testimonials, FAQs, sections) |
| **UI string** | Developer-owned interface text (button labels, validation messages, ARIA labels) |
| **LocalizedText** | An embedded object holding one string per locale |
| **Revision** | An immutable snapshot of a content entity, created on each save |
| **Angel** | Abofonsa's term for a patient's nominated family proxy (used in copy only) |

### 1.5 The content ownership rule

One rule governs where every string lives, and it is applied consistently throughout this
specification:

> **If a marketing or clinical staff member would plausibly want to reword it, it belongs in
> MongoDB and is edited in the CMS. If only a developer would change it, it belongs in a JSON
> translation file and is versioned with the code.**

So headings, lede paragraphs, service descriptions, plan features, testimonials and FAQ
answers are **content**. Navigation labels, button text, form field labels, validation
messages, screen-reader announcements and the `/ month` price suffix are **UI strings**.
Section 10.1 formalises this.

---

## 2. Solution overview

### 2.1 System context

```
                          ┌────────────────────────────┐
                          │   Public visitor (no auth) │
                          └─────────────┬──────────────┘
                                        │ HTTPS
                                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        CDN / reverse proxy (nginx)                     │
│   • TLS termination      • gzip + brotli      • static asset caching   │
└───────────────┬───────────────────────────────────┬───────────────────┘
                │ /  and /admin                     │ /api/v1/**
                ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│  Angular 22 application       │   │  Spring Boot 4.1 (Java 25)        │
│  ─ public site (SSR + hydrate)│   │  ─ public content API (read-only) │
│  ─ /admin CMS (lazy, guarded) │──▶│  ─ admin CMS API (JWT protected)  │
│  ─ Material 3 + Tailwind 4    │   │  ─ enquiry intake                 │
│  ─ Transloco i18n             │   │  ─ Caffeine cache                 │
└───────────────────────────────┘   └────────────┬──────────────────────┘
                                                 │ Spring Data MongoDB
                                                 ▼
                                    ┌───────────────────────────────────┐
                                    │  MongoDB 8.3 (replica set)        │
                                    │  content · revisions · media      │
                                    │  users · enquiries · audit        │
                                    └───────────────────────────────────┘
```

### 2.2 Request flows

**Public page load.** The browser requests `/` (or `/es`, `/fr`, `/de`). Angular SSR renders
the page server-side, calling `GET /api/v1/content/site?locale=xx` — a single aggregate
endpoint returning every published section, service, plan, testimonial and FAQ for that
locale. The response is served from an in-memory cache and typically completes in under
15 ms. The client hydrates and takes over. Subsequent locale switches are client-side fetches
of the same endpoint.

**Content edit.** An editor signs in at `/admin`, receives a short-lived JWT, edits a content
entity in one or more locales, and saves. Saving writes a new revision with status `DRAFT`.
Publishing promotes a revision to `PUBLISHED`, updates the entity's `publishedRevisionId`, and
evicts the affected cache entries so the public site reflects the change on the next request.

**Enquiry submission.** The consultation form posts to `POST /api/v1/enquiries`. The request
is rate-limited by IP, validated, persisted, and acknowledged. No account is created and no
authentication is involved — R8 holds.

### 2.3 Architectural decisions

| ID | Decision | Rationale |
|---|---|---|
| **AD-1** | Single Angular application with a lazy-loaded `/admin` route | Shared design system and build; admin code ships as a separate chunk so the public bundle is unaffected |
| **AD-2** | Localised content stored as embedded per-locale maps, not separate documents per locale | Four locales, read-heavy workload, atomic multi-locale updates, one document read serves any locale |
| **AD-3** | One aggregate public endpoint rather than per-section endpoints | The page needs everything at once; a single cached response removes request waterfalls in SSR |
| **AD-4** | Static JSON bundles as translation *defaults*, overridable from the CMS | Satisfies R7 while still letting staff correct wording without a deployment (§10.3) |
| **AD-5** | Server-side rendering with hydration | The site's purpose is discovery; SSR gives crawlable HTML and a fast first paint over Ghanaian mobile networks |
| **AD-6** | Revisions are immutable and append-only | Provides audit trail and rollback without a separate versioning system |

---

## 3. Technology stack

All versions verified current as of **July 2026**. Sources are listed in Appendix D.

### 3.1 Version matrix

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Language (frontend) | TypeScript | 5.9.x | Matches Angular 22 peer range |
| Framework | Angular | **22.0.x** | Current major, released mid-2026. Angular 21 is supported until May 2027 if a more conservative baseline is required |
| Components | Angular Material | 22.x | Material 3 with `--mat-sys-*` system tokens |
| CSS | Tailwind CSS | **4.1.x** | CSS-first configuration; no `tailwind.config.js` |
| i18n | `@jsverse/transloco` | 8.x | Runtime JSON translations, signal-friendly |
| SSR | Angular SSR (`@angular/ssr`) | 22.x | Node adapter with hydration |
| Language (backend) | Java | **25 (LTS)** | Records, sealed types, pattern matching, virtual threads, scoped values |
| Framework | Spring Boot | **4.1.0** | Released June 2026, on Spring Framework 7 |
| Data access | Spring Data MongoDB | Managed by Boot 4.1 BOM | Do not pin independently |
| Database | MongoDB | **8.3.x** | Replica set required for transactions and change streams |
| Build (frontend) | Angular CLI / esbuild | 22.x | |
| Build (backend) | Maven | 3.9.x | Gradle acceptable; Maven assumed throughout |
| Container | Eclipse Temurin JRE | 25 | Distroless base for production |

> **Note on the Java baseline.** Spring Boot 4.x requires Java 17 as a *minimum* but offers
> first-class support for Java 25, including AOT and GraalVM native image testing. This project
> mandates Java 25 as both the compile and runtime target — set `<maven.compiler.release>25`.
> Do not rely on preview features: structured concurrency remains a preview API in Java 25 and
> must not be enabled in production builds.

### 3.2 Why these choices

**Angular 22 with standalone components and signals.** The application is bootstrapped
zoneless (`provideZonelessChangeDetection()`). All state is held in signals, which suits a
content-driven site where data arrives once and rarely changes. No NgModules are used.

**Material 3 *and* Tailwind together.** Material supplies accessible, behaviourally correct
interactive components — menus, dialogs, form fields, expansion panels, snackbars — which
matter most in the CMS. Tailwind supplies layout and spacing utilities for the marketing
pages, which are largely bespoke and would be awkward to express through Material's theming
alone. §5.3 specifies how the two are made to coexist, which is the single most common source
of defects in this combination and must not be improvised.

**MongoDB.** Content entities are heterogeneous documents with per-locale text and nested
arrays (plan features, service bullet points). A document model avoids the join-heavy schema
a relational store would need for localised content, and the whole published site is a single
aggregate read.

---

## 4. Repository layout

A two-module monorepo. Frontend and backend build independently but version together.

```
abofonsa-bridgecare/
├── README.md
├── docker-compose.yml                 # mongo + api + web for local development
├── .github/workflows/ci.yml
│
├── web/                               # Angular 22 application
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/
│   │   └── i18n/                      # ← default translation bundles (R7)
│   │       ├── en.json
│   │       ├── es.json
│   │       ├── fr.json
│   │       └── de.json
│   └── src/
│       ├── main.ts
│       ├── main.server.ts
│       ├── server.ts
│       ├── styles.css                 # Tailwind entry + Material theme
│       ├── app/
│       │   ├── app.config.ts
│       │   ├── app.routes.ts
│       │   ├── app.ts
│       │   ├── core/
│       │   │   ├── api/               # typed HTTP clients
│       │   │   ├── i18n/              # Transloco loader, locale service
│       │   │   ├── auth/              # admin-only: token store, guard, interceptor
│       │   │   └── seo/               # meta + JSON-LD service
│       │   ├── shared/
│       │   │   ├── ui/                # carousel, section header, brand button
│       │   │   └── pipes/
│       │   ├── public/                # the marketing site
│       │   │   ├── public-shell.ts
│       │   │   └── sections/          # one component per page section (§6)
│       │   └── admin/                 # lazy-loaded CMS (§9)
│       │       ├── admin.routes.ts
│       │       └── features/
│       └── styles/
│           ├── _theme.scss            # Material 3 theme definition
│           └── _brand.css             # brand tokens shared with Tailwind
│
└── api/                               # Spring Boot 4.1 service
    ├── pom.xml
    ├── Dockerfile
    └── src/
        ├── main/
        │   ├── java/net/jojoaddison/abofonsa/
        │   │   ├── AbofonsaApplication.java
        │   │   ├── config/
        │   │   ├── common/            # LocalizedText, errors, pagination
        │   │   ├── content/           # services, plans, testimonials, faqs, sections
        │   │   ├── i18n/              # UI string overrides
        │   │   ├── media/
        │   │   ├── enquiry/
        │   │   ├── identity/          # admin users, JWT
        │   │   └── audit/
        │   └── resources/
        │       ├── application.yml
        │       └── db/migration/      # Mongock changelogs + seed data
        └── test/
```

Each backend package is a vertical slice containing its own `*Document`, `*Repository`,
`*Service`, `*Controller` and DTO records. Packages do not reach into each other's internals;
cross-slice calls go through the service interface only.

---

## 5. Frontend — Angular 22, Material 3, Tailwind 4

### 5.1 Application bootstrap

```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideTransloco } from '@jsverse/transloco';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './core/i18n/transloco-http.loader';
import { authInterceptor } from './core/auth/auth.interceptor';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './core/i18n/locales';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions(),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LOCALES],
        defaultLang: DEFAULT_LOCALE,
        fallbackLang: DEFAULT_LOCALE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: isDevMode(), useFallbackTranslation: true },
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
```

`withEventReplay()` matters here: the carousel arrows and the FAQ accordion are interactive
before hydration completes, and event replay ensures a click during that window is not lost.

### 5.2 Material 3 theme

The brand palette is derived from the logo — navy `#0D3058`, gold `#C59437` — with the cyan
`#17A9CE` from the storyboard reserved for the CMS accent so that admin screens are visually
distinguishable from the public site.

```scss
// src/styles/_theme.scss
@use '@angular/material' as mat;

html {
  color-scheme: light;

  @include mat.theme((
    color: (
      primary: mat.$azure-palette,   // replaced by the generated brand palette below
      tertiary: mat.$orange-palette,
    ),
    typography: (
      plain-family: (system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif),
      brand-family: (system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif),
    ),
    density: 0,
  ));

  // Brand overrides applied on top of the generated M3 system tokens.
  --mat-sys-primary: #0D3058;
  --mat-sys-on-primary: #FFFFFF;
  --mat-sys-primary-container: #E8EDF4;
  --mat-sys-on-primary-container: #0A2544;
  --mat-sys-tertiary: #C59437;
  --mat-sys-on-tertiary: #FFFFFF;
  --mat-sys-surface: #FFFFFF;
  --mat-sys-surface-container: #F6F7F9;
  --mat-sys-outline-variant: #E2E5EA;
}
```

Generate a proper tonal palette from the two brand hexes rather than hand-writing the tokens
above:

```bash
ng generate @angular/material:theme-color \
  --primary-color "#0D3058" --tertiary-color "#C59437" \
  --directory src/styles/
```

Commit the generated palette file and `@use` it in `_theme.scss`. Hand-edited system tokens
are acceptable only for the handful of values the generator cannot express.

### 5.3 Tailwind 4 alongside Material — integration contract

This is the highest-risk integration in the project. Three specific problems arise, each with
a mandated fix.

**Problem 1 — Tailwind Preflight resets Material component styling.** Tailwind's base layer
resets button, input and heading styles, which visibly breaks `mat-form-field`, `mat-button`
and menu overlays.

*Fix:* import Tailwind's layers individually and omit Preflight, then add only the resets the
marketing pages actually need.

```css
/* src/styles.css */
@layer tailwind-theme, material, tailwind-utilities;

@import 'tailwindcss/theme.css'     layer(tailwind-theme);
@import 'tailwindcss/utilities.css' layer(tailwind-utilities);
/* Preflight is deliberately NOT imported — see §5.3 Problem 1 */

@import './styles/brand.css';

/* Minimal, scoped replacement for the parts of Preflight we do want */
:where(.prose-reset) { h1,h2,h3,h4,p,ul,ol,figure,blockquote { margin: 0; } }
*, ::before, ::after { box-sizing: border-box; }
```

Declaring `@layer tailwind-theme, material, tailwind-utilities` first fixes cascade order:
Material's component CSS sits between Tailwind's theme and its utilities, so a utility class
such as `mt-4` still overrides a Material margin, but Material's internal component styling is
not clobbered by resets.

**Problem 2 — content scanning pulls in the entire workspace.** Angular's PostCSS integration
scans from the workspace root by default, so unused classes from every library land in the
production stylesheet.

*Fix:* declare explicit sources.

```css
@import 'tailwindcss/theme.css' layer(tailwind-theme);
@source './app/**/*.{html,ts}';
@source './styles/**/*.css';
@source not '../node_modules';
```

**Problem 3 — two parallel design token systems drift.** Tailwind's `--color-*` and Material's
`--mat-sys-*` will diverge unless one is derived from the other.

*Fix:* Material is the single source of truth; Tailwind's theme references it.

```css
/* src/styles/brand.css */
@theme {
  --color-brand-navy:    var(--mat-sys-primary);
  --color-brand-gold:    var(--mat-sys-tertiary);
  --color-brand-surface: var(--mat-sys-surface);
  --color-brand-line:    var(--mat-sys-outline-variant);
  --color-brand-body:    #4A5462;
  --color-brand-muted:   #6B7480;

  --font-serif: Georgia, 'Times New Roman', serif;

  --radius-card: 10px;
  --shadow-card: 0 2px 4px rgb(16 32 54 / 0.05), 0 8px 20px rgb(16 32 54 / 0.07);
}
```

`class="bg-brand-navy text-white"` and a Material button now resolve to the same navy, and
changing the theme changes both. **Never** hard-code a brand hex in a component template.

**Division of labour.** Tailwind owns layout, spacing, typography scale and the bespoke
marketing components. Material owns interactive controls. Do not restyle Material internals
with Tailwind utilities or `::ng-deep`; use Material's `overrides` mixins instead.

| Concern | Owner |
|---|---|
| Grid, flex, spacing, responsive breakpoints | Tailwind |
| Marketing cards, hero, stats band, pricing table | Tailwind |
| Buttons, form fields, select, datepicker, dialog, menu, snackbar, tabs, expansion panel | Material |
| Colour, typography, elevation tokens | Material (consumed by Tailwind via `@theme`) |

### 5.4 Routing

```typescript
// src/app/app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: PublicShell,
    resolve: { site: siteContentResolver },
    children: [{ path: '', component: HomePage, data: { section: 'home' } }],
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canMatch: [adminShellGuard],
  },
  { path: ':locale', component: PublicShell, resolve: { site: siteContentResolver },
    children: [{ path: '', component: HomePage }], matcher: localeRouteMatcher },
  { path: '**', component: NotFoundPage },
];
```

The public site is a single scrolling page; navigation is anchor-based (`#services`,
`#pricing`) with scroll-spy, exactly as the prototype behaves. Locale is expressed as a path
prefix (`/es`, `/fr`, `/de`) so each language is independently crawlable and shareable; `/`
serves English. `localeRouteMatcher` matches only the four supported codes so unknown paths
still reach the 404 route.

### 5.5 Data access

```typescript
// src/app/core/api/content.api.ts
@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  siteContent(locale: Locale): Observable<SiteContent> {
    return this.http.get<SiteContent>(`${this.base}/content/site`, { params: { locale } });
  }

  submitEnquiry(body: EnquiryRequest): Observable<EnquiryReceipt> {
    return this.http.post<EnquiryReceipt>(`${this.base}/enquiries`, body);
  }
}
```

```typescript
// src/app/core/api/site-content.store.ts
@Injectable({ providedIn: 'root' })
export class SiteContentStore {
  private readonly api = inject(ContentApi);
  private readonly locale = inject(LocaleService);

  private readonly resource = rxResource({
    request: () => ({ locale: this.locale.current() }),
    loader: ({ request }) => this.api.siteContent(request.locale),
  });

  readonly content  = computed(() => this.resource.value());
  readonly services = computed(() => this.content()?.services ?? []);
  readonly plans    = computed(() => this.content()?.plans ?? []);
  readonly stories  = computed(() => this.content()?.testimonials ?? []);
  readonly faqs     = computed(() => this.content()?.faqs ?? []);
  readonly loading  = computed(() => this.resource.isLoading());
}
```

Changing `LocaleService.current()` re-fetches automatically; every section component reads
from the same store, so a language switch updates the whole page from one request.

---

## 6. Component inventory

Each section of the approved design maps to one standalone component. All are
`ChangeDetectionStrategy.OnPush` and read content from `SiteContentStore`.

| # | Component | Section | Content source | Notes |
|---|---|---|---|---|
| 1 | `DemoNoticeBar` | Demo banner | UI string | Removed in production build via `environment.isDemo` |
| 2 | `TopContactStrip` | Phone / email / hours | `siteSettings` | |
| 3 | `SiteHeader` | Sticky nav + scroll-spy | `navigation` | `mat-menu` for the mobile drawer |
| 4 | `LanguageSwitcher` | Locale selector | Static | `mat-select`; writes to `LocaleService` |
| 5 | `HeroSection` | Hero, stats, badge | `sections.hero` | LCP element — see §13.1 |
| 6 | `AssuranceBar` | Four assurance items | `sections.assurance` | |
| 7 | `ServicesCarousel` | Six service slides | `services` | Uses `BrandCarousel` (§6.1) |
| 8 | `ProcessSteps` | Four-step process | `sections.process` | |
| 9 | `ApproachSection` | Split image + features | `sections.approach` | |
| 10 | `StatsBand` | Four statistics | `sections.stats` | |
| 11 | `AngelNetworkSection` | Split image + features | `sections.angel` | |
| 12 | `PricingSection` | Three plan cards | `plans` | |
| 13 | `PricingTable` | Feature comparison | `plans` | Derived from the same `plans` array |
| 14 | `TestimonialsCarousel` | Four testimonials | `testimonials` | Uses `BrandCarousel` |
| 15 | `FaqSection` | Accordion | `faqs` | `mat-accordion` / `mat-expansion-panel` |
| 16 | `CtaBand` | Closing call to action | `sections.cta` | |
| 17 | `ContactSection` | Details + enquiry form | `siteSettings` | Material form controls |
| 18 | `SiteFooter` | Four-column footer | `siteSettings`, `services` | |

### 6.1 `BrandCarousel` — shared component

Both carousels use one component. It is deliberately hand-built rather than pulled from a
third-party library: the behaviour is simple, and the prototype's exact interaction model is a
requirement.

**API**

```typescript
@Component({
  selector: 'abc-brand-carousel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-carousel.html',
})
export class BrandCarousel<T> {
  /** Slide data. */
  readonly items = input.required<readonly T[]>();
  /** Autoplay interval in ms; 0 disables autoplay. */
  readonly autoplayMs = input(7000);
  /** Accessible label for the carousel region. */
  readonly label = input.required<string>();
  /** Template rendered for each slide. */
  readonly slide = contentChild.required<TemplateRef<{ $implicit: T; index: number }>>('slide');

  readonly index = signal(0);
  readonly count = computed(() => this.items().length);
  readonly offset = computed(() => `translateX(${-this.index() * 100}%)`);

  next(): void { this.index.update(i => (i + 1) % this.count()); }
  prev(): void { this.index.update(i => (i - 1 + this.count()) % this.count()); }
  goTo(i: number): void { this.index.set(((i % this.count()) + this.count()) % this.count()); }
}
```

**Behavioural requirements** — these are acceptance criteria, each with a corresponding test
in §11.2:

| ID | Requirement |
|---|---|
| C-1 | `next()` from the last slide wraps to the first; `prev()` from the first wraps to the last |
| C-2 | Exactly one pagination dot carries `aria-current="true"` at any time |
| C-3 | Autoplay pauses on `mouseenter`, `focusin`, and when `document.hidden` becomes true; it resumes on the inverse events |
| C-4 | Any manual interaction restarts the autoplay timer rather than leaving it mid-interval |
| C-5 | `ArrowLeft` / `ArrowRight` navigate when focus is inside the carousel; the event is not propagated to the page |
| C-6 | Horizontal touch swipe beyond 45 px navigates; below that threshold the position is restored |
| C-7 | Off-screen slides are `aria-hidden="true"` and their focusable descendants carry `tabindex="-1"` |
| C-8 | When `prefers-reduced-motion: reduce` is set, autoplay does not start and the track transition is disabled |
| C-9 | The timer is cleared on destroy — verified by asserting no pending interval after `fixture.destroy()` |

**Implementation notes.** Track offset is applied via the `offset()` computed signal bound to
`[style.transform]`. Timer lifecycle is managed with `effect()` plus `DestroyRef`. Autoplay
must not run during SSR — guard with `afterNextRender()`.

### 6.2 Accessibility requirements

| Requirement | Detail |
|---|---|
| Landmarks | One `<header>`, `<main>`, `<footer>`; each section is a `<section>` with `aria-labelledby` |
| Skip link | First focusable element, targets `#main` |
| Contrast | Body text ≥ 4.5:1, large text ≥ 3:1 against its background — navy `#0D3058` on white is 12.6:1 |
| Focus | Visible focus ring on all interactive elements; never `outline: none` without a replacement |
| Carousel | Follows the APG carousel pattern: `role="group"`, `aria-roledescription="carousel"`, labelled controls |
| Forms | Every control has a `<label>`; errors are announced via `aria-describedby` and `role="alert"` |
| Language | `<html lang>` updated on locale change; `LanguageSwitcher` options carry `lang` attributes |
| Motion | All animation respects `prefers-reduced-motion` |
| Target size | Interactive targets ≥ 44 × 44 px |

Target: **WCAG 2.2 Level AA**. Automated axe-core checks run in CI (§11.4); automated testing
does not discharge the obligation to keyboard-test each release manually.

### 6.3 SEO and structured data

`SeoService` sets, per locale: `<title>`, `<meta name="description">`, Open Graph and Twitter
card tags, `<link rel="canonical">`, and `<link rel="alternate" hreflang="...">` for all four
locales plus `x-default`. It also injects JSON-LD:

- `MedicalBusiness` — name, address (Ankobra River Street #5, Teshie Nungua Estates, Accra),
  telephone, `areaServed: Greater Accra`, opening hours
- `Service` for each of the six services
- `Offer` for each of the three plans, with `priceCurrency: "GHS"`
- `FAQPage` built from the FAQ entries

All values come from MongoDB so they stay consistent with the visible page.

---

## 7. Backend — Spring Boot 4.1 on Java 25

### 7.1 Layering

```
controller  →  service  →  repository  →  MongoDB
    │             │
    │             └── domain records, business rules, revision/publish logic
    └── DTO records, validation, HTTP concerns only
```

Controllers never touch `*Document` types and repositories never return DTOs. Mapping happens
in the service layer via explicit mapper classes — no reflection-based mapping framework, so
that field renames fail at compile time.

### 7.2 Maven configuration

```xml
<properties>
  <java.version>25</java.version>
  <maven.compiler.release>25</maven.compiler.release>
  <spring-boot.version>4.1.0</spring-boot.version>
</properties>

<dependencies>
  <dependency><groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId></dependency>
  <dependency><groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId></dependency>
  <dependency><groupId>io.mongock</groupId>
    <artifactId>mongock-springboot</artifactId></dependency>
</dependencies>
```

```yaml
# application.yml
spring:
  application.name: abofonsa-bridgecare-api
  threads.virtual.enabled: true        # Java 25 virtual threads for request handling
  data.mongodb:
    uri: ${MONGODB_URI:mongodb://localhost:27017/abofonsa}
    auto-index-creation: false         # indexes are created by Mongock, not at runtime
  jackson:
    default-property-inclusion: non_null
    deserialization.fail-on-unknown-properties: true

abofonsa:
  locales.supported: en,es,fr,de
  locales.default: en
  cache.published-content-ttl: PT10M
  security.jwt.issuer: https://abofonsa.com
  security.jwt.access-token-ttl: PT30M
  security.jwt.refresh-token-ttl: P14D
  enquiry.rate-limit.per-hour-per-ip: 5
```

Virtual threads are enabled globally. The workload is I/O-bound (MongoDB reads, no CPU-heavy
work), so each request occupying a virtual thread while awaiting the database costs almost
nothing and removes the need to tune a platform thread pool.

### 7.3 Common domain types

Java 25 records and sealed interfaces make the domain explicit and exhaustively matchable.

```java
package net.jojoaddison.abofonsa.common;

/** A string carrying one value per supported locale. */
public record LocalizedText(Map<Locale, String> values) {

    public LocalizedText {
        values = values == null ? Map.of() : Map.copyOf(values);
    }

    public static LocalizedText of(String english) {
        return new LocalizedText(Map.of(Locale.EN, english));
    }

    /** Requested locale, else the default, else empty — never null. */
    public String resolve(Locale requested) {
        var direct = values.get(requested);
        if (direct != null && !direct.isBlank()) return direct;
        var fallback = values.get(Locale.EN);
        return fallback == null ? "" : fallback;
    }

    public boolean hasTranslation(Locale locale) {
        var v = values.get(locale);
        return v != null && !v.isBlank();
    }

    /** Fraction of supported locales with a non-blank value — drives the CMS progress bars. */
    public double completeness() {
        return (double) Locale.ALL.stream().filter(this::hasTranslation).count() / Locale.ALL.size();
    }
}

public enum Locale {
    EN("en", "English"), ES("es", "Español"), FR("fr", "Français"), DE("de", "Deutsch");

    public static final List<Locale> ALL = List.of(values());

    private final String code;
    private final String displayName;

    Locale(String code, String displayName) { this.code = code; this.displayName = displayName; }

    public String code() { return code; }
    public String displayName() { return displayName; }

    public static Locale fromCode(String code) {
        return ALL.stream()
                  .filter(l -> l.code.equalsIgnoreCase(code))
                  .findFirst()
                  .orElseThrow(() -> new UnsupportedLocaleException(code));
    }
}

public enum PublicationStatus { DRAFT, PUBLISHED, ARCHIVED }
```

Sealed interfaces model the content types, so any `switch` over them is checked for
exhaustiveness at compile time:

```java
public sealed interface ContentEntity
        permits ServiceEntity, PlanEntity, TestimonialEntity, FaqEntity, SectionEntity {

    String id();
    PublicationStatus status();
    Instant updatedAt();
}

// Pattern matching for switch — no default branch needed; adding a permitted
// type breaks the build until it is handled here.
static String cacheKeyFor(ContentEntity entity) {
    return switch (entity) {
        case ServiceEntity s     -> "service:"     + s.id();
        case PlanEntity p        -> "plan:"        + p.id();
        case TestimonialEntity t -> "testimonial:" + t.id();
        case FaqEntity f         -> "faq:"         + f.id();
        case SectionEntity sec   -> "section:"     + sec.key();
    };
}
```

### 7.4 Public API

All public endpoints are unauthenticated, read-only, cacheable, and return
`Cache-Control: public, max-age=300`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/content/site?locale={code}` | **Primary endpoint.** Full published site payload for one locale |
| `GET` | `/api/v1/content/services?locale={code}` | Services only |
| `GET` | `/api/v1/content/plans?locale={code}` | Plans only |
| `GET` | `/api/v1/content/faqs?locale={code}` | FAQs only |
| `GET` | `/api/v1/i18n/{locale}.json` | UI string overrides merged over defaults (§10.3) |
| `GET` | `/api/v1/locales` | Supported locales and their display names |
| `POST` | `/api/v1/enquiries` | Submit a consultation enquiry |
| `GET` | `/api/v1/health` | Liveness / readiness |

**`GET /api/v1/content/site` — response shape**

```json
{
  "locale": "es",
  "generatedAt": "2026-07-25T14:02:11Z",
  "siteSettings": {
    "organisationName": "Abofonsa BridgeCare",
    "tagline": "Proporcionando tranquilidad más allá de las fronteras",
    "phones": ["+233 302 717 577", "+233 502 588 736"],
    "email": "info@abofonsa.com",
    "address": {
      "street": "Ankobra River Street #5",
      "district": "Teshie Nungua Estates",
      "city": "Accra",
      "country": "Ghana"
    },
    "coordinationHours": "Lunes a sábado, 07:00–19:00 GMT",
    "onCallHours": "24 horas, todos los días"
  },
  "sections": {
    "hero": {
      "eyebrow": "Proporcionando tranquilidad más allá de las fronteras",
      "heading": "Atención de nivel hospitalario, en su propio hogar.",
      "subheading": "Abofonsa significa «Manos Angelicales».",
      "body": "…",
      "stats": [
        { "value": "99%",   "label": "Turnos cubiertos" },
        { "value": "24/7",  "label": "Atención supervisada" },
        { "value": "365",   "label": "Días al año" },
        { "value": "Accra", "label": "y Gran Accra" }
      ],
      "image": { "id": "…", "url": "/media/hero.jpg", "alt": "…", "width": 1180, "height": 760 }
    }
  },
  "services":     [ /* ServiceView[] */ ],
  "plans":        [ /* PlanView[]    */ ],
  "testimonials": [ /* TestimonialView[] */ ],
  "faqs":         [ /* FaqView[] */ ]
}
```

**View records** — flat, locale-resolved, ready to render. No `LocalizedText` crosses the API
boundary; resolution happens server-side.

```java
public record ServiceView(
        String id, String slug, String name, String blurb,
        List<String> points, String availableOn, MediaView image, int displayOrder) {}

public record PlanView(
        String id, String code, String name, String forWho,
        String priceAmount,      // pre-formatted for the locale, e.g. "3.000" (es) / "3,000" (en)
        String priceCurrency,    // always "GHS"
        String priceNote, boolean featured,
        List<PlanFeatureView> features, int displayOrder) {}

public record PlanFeatureView(String label, boolean included, boolean emphasised) {}

public record TestimonialView(
        String id, String quote, String personName, String personRole,
        String planLabel, int rating, MediaView portrait, int displayOrder) {}

public record FaqView(String id, String question, String answer, int displayOrder) {}

public record MediaView(String id, String url, String alt, int width, int height, String blurHash) {}
```

**`POST /api/v1/enquiries` — request**

```java
public record EnquiryRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 40) @Pattern(regexp = "^[0-9+()\\-.\\s]{7,40}$") String phone,
        @Email @Size(max = 160) String email,
        @Size(max = 40) String planOfInterest,
        @Size(max = 60) String relationship,
        @Size(max = 4000) String message,
        @Size(max = 10) String locale,
        @Size(max = 200) String sourcePage) {}
```

Responds `201 Created` with `{ "reference": "ENQ-2026-004182", "receivedAt": "…" }`.
The reference is a human-quotable identifier for phone follow-up.

### 7.5 Admin API

All admin endpoints require a valid JWT with an appropriate role and are namespaced under
`/api/v1/admin`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/auth/login` | — | Exchange credentials for tokens |
| `POST` | `/auth/refresh` | — | Rotate the refresh token |
| `POST` | `/auth/logout` | any | Revoke the refresh token |
| `GET` | `/content/{type}` | VIEWER | List entities with all locales and completeness |
| `GET` | `/content/{type}/{id}` | VIEWER | Single entity, all locales |
| `POST` | `/content/{type}` | EDITOR | Create (status `DRAFT`) |
| `PUT` | `/content/{type}/{id}` | EDITOR | Update — writes a new revision |
| `POST` | `/content/{type}/{id}/publish` | PUBLISHER | Promote the current draft |
| `POST` | `/content/{type}/{id}/unpublish` | PUBLISHER | Revert to unpublished |
| `POST` | `/content/{type}/{id}/reorder` | EDITOR | Change `displayOrder` |
| `DELETE` | `/content/{type}/{id}` | PUBLISHER | Soft delete → `ARCHIVED` |
| `GET` | `/content/{type}/{id}/revisions` | VIEWER | Revision history |
| `POST` | `/content/{type}/{id}/revisions/{rev}/restore` | PUBLISHER | Roll back |
| `GET` | `/i18n/{locale}` | VIEWER | UI string overrides for a locale |
| `PUT` | `/i18n/{locale}` | EDITOR | Upsert overrides |
| `DELETE` | `/i18n/{locale}/{key}` | EDITOR | Drop an override, reverting to the JSON default |
| `GET` | `/i18n/coverage` | VIEWER | Missing-key report across all locales |
| `POST` | `/media` | EDITOR | Upload (multipart) |
| `GET` | `/media` | VIEWER | Paginated media library |
| `DELETE` | `/media/{id}` | PUBLISHER | Delete if unreferenced |
| `GET` | `/enquiries` | VIEWER | Paginated, filterable enquiry list |
| `PATCH` | `/enquiries/{id}` | EDITOR | Update handling status |
| `GET` | `/audit` | ADMIN | Audit trail |

`{type}` ∈ `services | plans | testimonials | faqs | sections | settings`.

### 7.6 Error handling

RFC 9457 `ProblemDetail`, which Spring supports natively.

```java
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail onValidation(MethodArgumentNotValidException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI.create("https://abofonsa.com/problems/validation"));
        problem.setTitle("Validation failed");
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", e.getDefaultMessage()))
                .toList());
        return problem;
    }

    @ExceptionHandler(ContentNotFoundException.class)
    ProblemDetail onNotFound(ContentNotFoundException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setType(URI.create("https://abofonsa.com/problems/not-found"));
        problem.setTitle("Content not found");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    @ExceptionHandler(UnsupportedLocaleException.class)
    ProblemDetail onLocale(UnsupportedLocaleException ex) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Unsupported locale");
        problem.setProperty("supported", Locale.ALL.stream().map(Locale::code).toList());
        return problem;
    }
}
```

Internal errors return a generic problem document; stack traces and messages are never
returned to clients. Every 5xx is logged with a correlation id echoed in `X-Request-Id`.

### 7.7 Security

| Concern | Approach |
|---|---|
| Public endpoints | `permitAll()` — no session, no cookie, `SessionCreationPolicy.STATELESS` |
| Admin authentication | Username + password → JWT access token (30 min) + refresh token (14 days, rotated, stored hashed) |
| Password storage | `BCryptPasswordEncoder` at strength 12 |
| Authorisation | `@PreAuthorize("hasRole('EDITOR')")` on admin service methods, not only controllers |
| Brute force | Account lockout for 15 minutes after 5 failed attempts, tracked per username and per IP |
| CORS | Explicit allow-list of the site origins; credentials disabled |
| CSRF | Not applicable — tokens are sent in `Authorization`, nothing in cookies |
| Enquiry abuse | Rate limit 5/hour/IP, honeypot field, minimum submission dwell time |
| Headers | HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP (§13.2) |
| Uploads | Extension and magic-byte allow-list (JPEG, PNG, WebP, AVIF), 8 MB cap, re-encoded on ingest to strip EXIF |
| Secrets | Environment variables only; never committed. JWT signing key ≥ 256-bit, rotated annually |

```java
@Bean
SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(CsrfConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.GET, "/api/v1/content/**", "/api/v1/i18n/**",
                                             "/api/v1/locales", "/api/v1/health").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/enquiries").permitAll()
            .requestMatchers("/api/v1/admin/auth/login", "/api/v1/admin/auth/refresh").permitAll()
            .requestMatchers("/api/v1/admin/**").authenticated()
            .anyRequest().denyAll())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .headers(h -> h.httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true)))
        .build();
}
```

> **R8 compliance.** No public route requires or offers authentication. The `/admin` route is
> excluded from `sitemap.xml`, marked `noindex`, and is the only part of the system with a
> login screen.

### 7.8 Caching

```java
@Configuration
@EnableCaching
class CacheConfig {

    static final String SITE_CONTENT = "siteContent";
    static final String I18N_BUNDLE  = "i18nBundle";

    @Bean
    CacheManager cacheManager() {
        var manager = new CaffeineCacheManager(SITE_CONTENT, I18N_BUNDLE);
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(64)                       // 4 locales × generous headroom
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats());
        return manager;
    }
}

@Service
public class SiteContentService {

    @Cacheable(cacheNames = SITE_CONTENT, key = "#locale.code()")
    public SiteContentView publishedSite(Locale locale) { /* … */ }
}

@Service
public class PublishingService {

    /** Any publish or unpublish clears every locale — the aggregate spans all of them. */
    @CacheEvict(cacheNames = { SITE_CONTENT, I18N_BUNDLE }, allEntries = true)
    public void publish(ContentType type, String id, String actorId) { /* … */ }
}
```

Cache statistics are exposed through Actuator. Because eviction is global on publish and
publishes are infrequent, the simplicity is worth more than fine-grained invalidation.

### 7.9 Java 25 language features in use

| Feature | Where |
|---|---|
| Records | All DTOs, view models and value objects |
| Sealed interfaces | `ContentEntity` hierarchy, ensuring exhaustive `switch` |
| Pattern matching for `switch` | Content type dispatch, cache key derivation, revision diffing |
| Text blocks | Mongock seed documents, aggregation pipeline definitions, test fixtures |
| Virtual threads | Enabled globally via `spring.threads.virtual.enabled` |
| Scoped values | Propagating the request correlation id and actor through the call stack |
| `Optional` / streams | Repository result handling, completeness calculations |

Structured concurrency remains a preview API in Java 25 and **must not** be used; no
`--enable-preview` flag appears in any build or runtime configuration.

---

## 8. Data model — MongoDB

### 8.1 Conventions

- Collection names are lowerCamelCase plural: `services`, `plans`, `contentRevisions`
- `_id` is an `ObjectId`; the API exposes its hex string
- Every document carries `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- Localised strings are embedded objects keyed by locale code: `{ "en": "…", "es": "…" }`
- A missing locale key means *not yet translated*; an empty string means *deliberately blank*
- Soft delete via `status: "ARCHIVED"` — documents are never physically removed except media
- `schemaVersion` on every document supports forward migration

### 8.2 Collections

#### `services`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  slug: "elderly-companion-care",            // unique, stable, locale-independent
  name: {
    en: "Elderly & companion care",
    es: "Atención a personas mayores y compañía",
    fr: "Aide aux personnes âgées et compagnie",
    de: "Seniorenbetreuung und Gesellschaft"
  },
  blurb: { en: "Day-to-day support that helps …", es: "…", fr: "…", de: "…" },
  points: [                                   // ordered bullet list, each localised
    { en: "Washing, dressing and personal care", es: "…", fr: "…", de: "…" },
    { en: "Medication prompting and reconciliation", es: "…", fr: "…", de: "…" }
  ],
  availableOn: { en: "All plans", es: "Todos los planes", fr: "…", de: "…" },
  imageId: ObjectId("..."),                   // → media
  displayOrder: 1,
  status: "PUBLISHED",
  publishedRevisionId: ObjectId("..."),
  createdAt: ISODate("2026-06-01T09:00:00Z"),
  updatedAt: ISODate("2026-07-20T11:24:00Z"),
  createdBy: "usr_admin",
  updatedBy: "usr_editor_ama"
}
```

#### `plans`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  code: "PAWPAW",                             // PEAR | PAWPAW | MELON — immutable
  name: { en: "PAWPAW Plan", es: "Plan PAWPAW", fr: "Forfait PAWPAW", de: "PAWPAW-Tarif" },
  forWho: { en: "Daily clinical oversight for …", es: "…", fr: "…", de: "…" },
  price: {
    amount: NumberDecimal("5000.00"),         // Decimal128 — never a double for money
    currency: "GHS",
    period: "MONTH"
  },
  priceNote: { en: "Most commonly chosen plan · 30 days' notice", es: "…", fr: "…", de: "…" },
  featured: true,
  features: [
    { label: { en: "7 weekly visits", es: "7 visitas semanales",
               fr: "7 visites hebdomadaires", de: "7 Besuche pro Woche" },
      included: true, emphasised: true },
    { label: { en: "Nursing and doctor support", es: "…", fr: "…", de: "…" },
      included: true, emphasised: true },
    { label: { en: "24/7 on-call availability", es: "…", fr: "…", de: "…" },
      included: false, emphasised: false }
  ],
  comparison: {                               // drives the feature comparison table
    visitsPerWeek:  { en: "7 weekly visits", es: "…", fr: "…", de: "…" },
    medicalSupport: { en: "Nursing & doctor", es: "…", fr: "…", de: "…" },
    auxiliary:      { en: "Cleaning, cooking, grocery, personal care", es: "…", fr: "…", de: "…" },
    telemetry:      { en: "Included", es: "…", fr: "…", de: "…" },
    reporting:      { en: "After every visit", es: "…", fr: "…", de: "…" },
    careManager:    { en: "Shared", es: "…", fr: "…", de: "…" }
  },
  displayOrder: 2,
  status: "PUBLISHED",
  publishedRevisionId: ObjectId("..."),
  createdAt: ISODate("..."), updatedAt: ISODate("..."),
  createdBy: "usr_admin", updatedBy: "usr_admin"
}
```

> **Money.** `NumberDecimal` (BSON Decimal128) mapped to `java.math.BigDecimal`. Never
> `Double` — binary floating point cannot represent decimal currency exactly. The amount is
> stored once and formatted per locale at render time (§10.5); the currency is always GHS
> regardless of the language being displayed.

#### `testimonials`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  quote: { en: "My mother refused to leave her house …", es: "…", fr: "…", de: "…" },
  personName: "Adwoa Boateng",                // NOT localised — proper nouns are not translated
  personRole: { en: "Daughter · Subscriber since 2025", es: "…", fr: "…", de: "…" },
  planLabel: { en: "PAWPAW Plan", es: "…", fr: "…", de: "…" },
  rating: 5,                                  // 1–5
  portraitId: ObjectId("..."),
  consent: {
    obtained: true,
    obtainedAt: ISODate("2026-05-14T00:00:00Z"),
    evidenceRef: "consent/2026/adwoa-boateng.pdf"
  },
  displayOrder: 1,
  status: "PUBLISHED",
  publishedRevisionId: ObjectId("..."),
  createdAt: ISODate("..."), updatedAt: ISODate("..."),
  createdBy: "usr_admin", updatedBy: "usr_admin"
}
```

> **Consent is mandatory.** A testimonial identifies a real person in a healthcare context.
> `consent.obtained` must be `true` before `status` may become `PUBLISHED`; the publish
> endpoint rejects the transition otherwise. This is enforced in `PublishingService`, not only
> in the UI.

#### `faqs`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  question: { en: "Which areas do you currently cover?", es: "…", fr: "…", de: "…" },
  answer:   { en: "We operate across Greater Accra, including …", es: "…", fr: "…", de: "…" },
  category: "COVERAGE",                       // COVERAGE | STAFF | PLANS | CLINICAL | BILLING
  displayOrder: 1,
  status: "PUBLISHED",
  publishedRevisionId: ObjectId("..."),
  createdAt: ISODate("..."), updatedAt: ISODate("..."),
  createdBy: "usr_admin", updatedBy: "usr_admin"
}
```

#### `sections`

Page sections whose copy is editable but whose layout is fixed in code.

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  key: "hero",              // hero | assurance | process | approach | stats | angel | cta
  eyebrow:    { en: "Providing peace of mind across borders", es: "…", fr: "…", de: "…" },
  heading:    { en: "Hospital-grade care, delivered to the door.", es: "…", fr: "…", de: "…" },
  subheading: { en: "Abofonsa means \"Angelic Hands\".", es: "…", fr: "…", de: "…" },
  body:       { en: "Abofonsa BridgeCare Health Connect brings …", es: "…", fr: "…", de: "…" },
  items: [                                    // assurance items, process steps, stats, features
    {
      key: "stat-fulfilment",
      icon: "shield",                         // icon registry key, not markup
      title: { en: "99%", es: "99 %", fr: "99 %", de: "99 %" },
      body:  { en: "Shift fulfilment", es: "Turnos cubiertos",
               fr: "Taux de couverture", de: "Schichtabdeckung" }
    }
  ],
  imageId: ObjectId("..."),
  status: "PUBLISHED",
  publishedRevisionId: ObjectId("..."),
  createdAt: ISODate("..."), updatedAt: ISODate("..."),
  createdBy: "usr_admin", updatedBy: "usr_admin"
}
```

#### `siteSettings`

Singleton — exactly one document, guarded by a unique index on a constant field.

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  singleton: "SITE",                          // unique index; prevents a second document
  organisationName: "Abofonsa BridgeCare",
  tagline: { en: "Providing peace of mind across borders", es: "…", fr: "…", de: "…" },
  phones: ["+233 302 717 577", "+233 502 588 736"],
  whatsapp: "+233 242 286 304",
  email: "info@abofonsa.com",
  website: "https://www.abofonsa.com",
  address: {
    street: "Ankobra River Street #5",
    district: "Teshie Nungua Estates",
    city: "Accra",
    country: "Ghana",
    geo: { type: "Point", coordinates: [-0.1077, 5.5820] }   // GeoJSON, [lng, lat]
  },
  coordinationHours: { en: "Monday–Saturday, 07:00–19:00 GMT", es: "…", fr: "…", de: "…" },
  onCallHours:       { en: "24 hours, every day", es: "…", fr: "…", de: "…" },
  socialLinks: [{ platform: "LINKEDIN", url: "https://…" }],
  seo: {
    defaultTitle:       { en: "Abofonsa BridgeCare — Professional Home Healthcare in Ghana", es: "…" },
    defaultDescription: { en: "…", es: "…", fr: "…", de: "…" },
    ogImageId: ObjectId("...")
  },
  updatedAt: ISODate("..."), updatedBy: "usr_admin"
}
```

#### `uiTranslationOverrides`

CMS-editable overrides layered on top of the shipped JSON bundles (§10.3).

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  locale: "es",                               // unique
  entries: {
    "nav.pricing": "Planes y tarifas",        // overrides the bundled default
    "form.submit": "Enviar solicitud"
  },
  updatedAt: ISODate("..."), updatedBy: "usr_editor_ama"
}
```

#### `contentRevisions`

Append-only history for every content entity.

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  entityType: "SERVICE",                      // SERVICE|PLAN|TESTIMONIAL|FAQ|SECTION|SETTINGS
  entityId: ObjectId("..."),
  revisionNumber: 7,                          // monotonic per entity
  snapshot: { /* complete entity document at this revision */ },
  status: "PUBLISHED",
  changeSummary: "Updated Spanish blurb; added fourth bullet point",
  changedLocales: ["es"],
  createdAt: ISODate("2026-07-20T11:24:00Z"),
  createdBy: "usr_editor_ama"
}
```

Retention: the latest 50 revisions per entity, plus every revision that was ever published.
A scheduled job prunes the remainder monthly.

#### `media`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  filename: "hero-family-carer.jpg",
  contentType: "image/jpeg",
  bytes: 148221,
  width: 1180, height: 760,
  blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",   // inline placeholder while loading
  storageKey: "media/2026/07/hero-family-carer.jpg",
  variants: [                                 // generated on upload
    { label: "thumb",  width: 320,  storageKey: "…", bytes: 18420 },
    { label: "medium", width: 760,  storageKey: "…", bytes: 61200 },
    { label: "full",   width: 1180, storageKey: "…", bytes: 148221 }
  ],
  alt: { en: "A nurse reviewing a care plan with a patient and her family",
         es: "…", fr: "…", de: "…" },         // alt text is localised — it is read aloud
  referencedBy: [{ entityType: "SECTION", entityId: ObjectId("...") }],
  createdAt: ISODate("..."), createdBy: "usr_admin"
}
```

Binaries live on the filesystem or object storage, not in MongoDB. GridFS is unnecessary here:
every asset is far below the 16 MB document limit, but serving images through the application
layer wastes resources that a static file server handles better. `referencedBy` is maintained
on save so deletion of an in-use asset can be refused.

#### `adminUsers`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  username: "ama.mensah",                     // unique
  email: "ama@abofonsa.com",                  // unique
  displayName: "Ama Mensah",
  passwordHash: "$2b$12$...",
  roles: ["EDITOR"],                          // VIEWER | EDITOR | PUBLISHER | ADMIN
  localeScope: ["es", "fr"],                  // empty = all locales
  active: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: ISODate("..."),
  mustChangePassword: false,
  createdAt: ISODate("..."), createdBy: "usr_admin"
}
```

`localeScope` supports the realistic case of a contracted translator who may edit only the
French content and cannot touch English or publish anything.

#### `enquiries`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  reference: "ENQ-2026-004182",               // unique, human-quotable
  name: "Kwame Asare",
  phone: "+233 24 000 0000",
  email: "kwame@example.com",
  planOfInterest: "PAWPAW",
  relationship: "A parent or grandparent",
  message: "…",
  locale: "en",
  sourcePage: "/#pricing",
  status: "NEW",                              // NEW | CONTACTED | QUALIFIED | CLOSED
  assignedTo: null,
  notes: [{ at: ISODate("..."), by: "usr_admin", text: "Called, left voicemail" }],
  meta: { ipHash: "sha256:…", userAgent: "…", submittedAt: ISODate("...") },
  retentionExpiresAt: ISODate("2028-07-25T00:00:00Z"),   // TTL index (§13.3)
  createdAt: ISODate("...")
}
```

> **Data minimisation.** The enquiry form must not collect clinical detail. The `message`
> field is free text and could contain health information volunteered by the sender, so it is
> treated as sensitive: access is restricted to authenticated staff, it is excluded from logs
> and analytics, and the raw IP is stored only as a salted hash for rate limiting.

#### `auditLog`

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 1,
  at: ISODate("2026-07-20T11:24:03Z"),
  actorId: "usr_editor_ama",
  actorName: "Ama Mensah",
  action: "CONTENT_PUBLISHED",                // see enum below
  entityType: "SERVICE",
  entityId: ObjectId("..."),
  locale: "es",
  detail: { revisionNumber: 7, previousStatus: "DRAFT" },
  ipHash: "sha256:…",
  requestId: "3f9a1c2e-…"
}
```

Actions: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `CONTENT_CREATED`, `CONTENT_UPDATED`,
`CONTENT_PUBLISHED`, `CONTENT_UNPUBLISHED`, `CONTENT_ARCHIVED`, `REVISION_RESTORED`,
`TRANSLATION_UPDATED`, `MEDIA_UPLOADED`, `MEDIA_DELETED`, `USER_CREATED`, `USER_DISABLED`,
`ENQUIRY_VIEWED`, `ENQUIRY_UPDATED`.

### 8.3 Indexes

Created explicitly through Mongock — `auto-index-creation` is off so that index changes are
reviewable, versioned and deliberate.

```javascript
// content collections
db.services.createIndex({ slug: 1 }, { unique: true });
db.services.createIndex({ status: 1, displayOrder: 1 });
db.plans.createIndex({ code: 1 }, { unique: true });
db.plans.createIndex({ status: 1, displayOrder: 1 });
db.testimonials.createIndex({ status: 1, displayOrder: 1 });
db.faqs.createIndex({ status: 1, displayOrder: 1 });
db.faqs.createIndex({ category: 1, displayOrder: 1 });
db.sections.createIndex({ key: 1 }, { unique: true });
db.siteSettings.createIndex({ singleton: 1 }, { unique: true });

// i18n
db.uiTranslationOverrides.createIndex({ locale: 1 }, { unique: true });

// revisions
db.contentRevisions.createIndex({ entityType: 1, entityId: 1, revisionNumber: -1 });
db.contentRevisions.createIndex({ createdAt: -1 });

// media
db.media.createIndex({ storageKey: 1 }, { unique: true });
db.media.createIndex({ createdAt: -1 });

// identity
db.adminUsers.createIndex({ username: 1 }, { unique: true });
db.adminUsers.createIndex({ email: 1 }, { unique: true });

// enquiries
db.enquiries.createIndex({ reference: 1 }, { unique: true });
db.enquiries.createIndex({ status: 1, createdAt: -1 });
db.enquiries.createIndex({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL

// audit
db.auditLog.createIndex({ at: -1 });
db.auditLog.createIndex({ actorId: 1, at: -1 });
db.auditLog.createIndex({ entityType: 1, entityId: 1, at: -1 });
```

The compound `{ status: 1, displayOrder: 1 }` indexes serve the dominant query exactly — fetch
published entities in display order — and are covering for the sort, avoiding an in-memory sort
stage.

### 8.4 Schema validation

MongoDB JSON Schema validation is applied at collection level as a second line of defence
behind Bean Validation. Example for `plans`:

```javascript
db.createCollection("plans", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["code", "name", "price", "status", "displayOrder", "schemaVersion"],
      properties: {
        code:   { enum: ["PEAR", "PAWPAW", "MELON"] },
        status: { enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        price: {
          bsonType: "object",
          required: ["amount", "currency", "period"],
          properties: {
            amount:   { bsonType: "decimal" },
            currency: { enum: ["GHS"] },
            period:   { enum: ["MONTH", "WEEK", "VISIT"] }
          }
        },
        name: {
          bsonType: "object",
          required: ["en"],                    // English is always mandatory
          properties: { en: { bsonType: "string", minLength: 1 } }
        },
        displayOrder: { bsonType: "int", minimum: 0 }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

Requiring `en` on every localised field enforces the fallback guarantee: `LocalizedText.resolve`
can always return something meaningful.

### 8.5 Migrations and seed data

Mongock changelogs live in `db/migration` and run at startup, recorded in a
`mongockChangeLog` collection so each executes once.

| Changelog | Purpose |
|---|---|
| `V001_create_collections_and_indexes` | Collections, JSON Schema validators, indexes |
| `V002_seed_site_settings` | Contact details, address, SEO defaults |
| `V003_seed_sections` | Hero, assurance, process, approach, stats, angel, CTA — all four locales |
| `V004_seed_services` | The six services with localised names, blurbs and bullet points |
| `V005_seed_plans` | PEAR / PAWPAW / MELON with prices, features and comparison rows |
| `V006_seed_testimonials` | Four testimonials, `consent.obtained: true` |
| `V007_seed_faqs` | Seven FAQ entries |
| `V008_seed_admin_user` | Bootstrap ADMIN account; `mustChangePassword: true` |

Seed content is transcribed from the approved prototype so that a fresh deployment reproduces
the signed-off site exactly. The bootstrap password is supplied by environment variable and is
never a literal in the changelog.

**Canonical plan values for `V005_seed_plans`.** These are the authoritative figures, taken
from the approved storyboard and prototype. They are the single source of truth for the seed
changelog, the comparison table and any quotation document; if a price changes, it changes
here first.

| | **PEAR** | **PAWPAW** | **MELON** |
|---|---|---|---|
| `code` | `PEAR` | `PAWPAW` | `MELON` |
| `price.amount` | `NumberDecimal("3000.00")` | `NumberDecimal("5000.00")` | `NumberDecimal("8000.00")` |
| `price.currency` | `GHS` | `GHS` | `GHS` |
| `price.period` | `MONTH` | `MONTH` | `MONTH` |
| `featured` | `false` | **`true`** | `false` |
| `displayOrder` | `1` | `2` | `3` |
| `comparison.visitsPerWeek` | 5 weekly visits | 7 weekly visits | 24/7 availability |
| `comparison.medicalSupport` | Nursing support | Nursing & doctor | Nursing & doctor |
| `comparison.auxiliary` | Cleaning, washing, grocery | Cleaning, cooking, grocery, personal care | All inclusive |
| `comparison.telemetry` | Included | Included | Included, with overnight review |
| `comparison.reporting` | After every visit | After every visit | After every visit |
| `comparison.careManager` | Shared | Shared | Dedicated |

Exactly one plan may carry `featured: true`; the seed changelog asserts this, and the publish
endpoint rejects a second one.

---

## 9. Content Management System

A deliberately small CMS. It manages six fixed content types and the UI string overrides —
it is not a general-purpose page builder, and resisting that scope creep is what keeps it
maintainable by a small team.

### 9.1 Roles

| Role | Read | Create / edit drafts | Publish | Manage users | Notes |
|---|:---:|:---:|:---:|:---:|---|
| `VIEWER` | ✓ | — | — | — | Read-only; useful for clinical reviewers |
| `EDITOR` | ✓ | ✓ | — | — | Constrained by `localeScope` |
| `PUBLISHER` | ✓ | ✓ | ✓ | — | Can promote drafts and roll back |
| `ADMIN` | ✓ | ✓ | ✓ | ✓ | Full access, including the audit log |

`localeScope` narrows an EDITOR to specific locales. A translator scoped to `["fr"]` sees the
English source as read-only reference and may edit only the French column — the realistic
arrangement when translation is contracted out.

### 9.2 Screens

```
/admin
├── /login                       Credentials → JWT
├── /                            Dashboard: publication state, translation coverage,
│                                new enquiries, recent activity
├── /content
│   ├── /sections                Page sections (hero, assurance, process, …)
│   ├── /services                List + reorder (drag handle) + edit
│   ├── /plans                   Pricing tiers, features, comparison rows
│   ├── /testimonials            Includes the consent gate
│   └── /faqs                    List + reorder + edit, grouped by category
├── /translations                Side-by-side translation workspace (§9.4)
├── /media                       Upload, browse, alt text per locale, usage report
├── /enquiries                   Inbox, status workflow, notes
├── /settings                    Contact details, hours, SEO defaults
├── /users                       ADMIN only
└── /audit                       ADMIN only
```

### 9.3 The editor

Every content editor follows one pattern: a locale tab strip across the top, the form beneath,
and a live preview panel alongside.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Services ▸ Elderly & companion care            DRAFT ·  unpublished     │
├──────────────────────────────────────────────────────────────────────────┤
│  [ English ✓ ] [ Español ✓ ] [ Français ⚠ ] [ Deutsch ○ ]                │
│                                                     ⚠ 2 fields missing   │
├───────────────────────────────────┬──────────────────────────────────────┤
│  Name                             │            Preview (Français)        │
│  ┌─────────────────────────────┐  │   ┌──────────────────────────────┐   │
│  │ Aide aux personnes âgées …  │  │   │  [photo]                     │   │
│  └─────────────────────────────┘  │   │  Aide aux personnes âgées    │   │
│  EN: Elderly & companion care     │   │  et compagnie                │   │
│                                   │   │  ✓ Toilette, habillage …     │   │
│  Blurb                            │   └──────────────────────────────┘   │
│  ┌─────────────────────────────┐  │                                      │
│  │ Un accompagnement quotidien…│  │                                      │
│  └─────────────────────────────┘  │                                      │
│  EN: Day-to-day support that …    │                                      │
│                                   │                                      │
│  Bullet points          [+ Add]   │                                      │
│  ⠿ 1  Toilette, habillage …  [×]  │                                      │
│  ⠿ 2  Rappels de médicaments [×]  │                                      │
├───────────────────────────────────┴──────────────────────────────────────┤
│  [ Discard ]            [ Save draft ]         [ Save and publish ]      │
└──────────────────────────────────────────────────────────────────────────┘
```

Requirements:

| ID | Requirement |
|---|---|
| **E-1** | Each locale tab shows a status glyph: ✓ complete, ⚠ partial, ○ untranslated |
| **E-2** | When editing a non-English locale, the English source is displayed beneath each field as read-only reference |
| **E-3** | English fields are mandatory; other locales may be saved incomplete |
| **E-4** | Unsaved changes trigger a confirmation dialog on navigation (`CanDeactivate` guard) |
| **E-5** | Saving writes a new revision and never mutates the previous one |
| **E-6** | Publishing is blocked, with a clear explanation, if English is incomplete |
| **E-7** | Bullet points, features and section items reorder by drag (Angular CDK `DragDrop`) |
| **E-8** | The preview renders the actual public component, not an approximation |
| **E-9** | Concurrent edits are detected optimistically via `@Version`; the loser is offered a diff |
| **E-10** | Publishing a testimonial without recorded consent is refused server-side (§8.2) |

### 9.4 Translation workspace

A dedicated screen for working across an entire locale rather than entity by entity — the view
a contracted translator actually needs.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Translations                        Locale: [ Français ▾ ]   68% ████░░ │
├──────────────────────────────────────────────────────────────────────────┤
│  Filter: [ All ▾ ] [ ☑ Missing only ]        Search: [____________]      │
├────────────┬─────────────────────────────┬───────────────────────────────┤
│  Key       │  English (source)           │  Français                     │
├────────────┼─────────────────────────────┼───────────────────────────────┤
│ services…  │ Skilled nursing visits      │ Soins infirmiers à domicile   │
│   .blurb   │ Clinical care delivered at… │ ⚠ untranslated                │
│ plans.PEAR │ A dependable weekday …      │ Une routine fiable en semaine │
│ nav.pricing│ Plans & pricing             │ Forfaits et tarifs      [DEF] │
└────────────┴─────────────────────────────┴───────────────────────────────┘
   [DEF] = value comes from the shipped JSON default and has not been overridden
```

| ID | Requirement |
|---|---|
| **T-1** | One row per translatable field across all content types plus every UI string key |
| **T-2** | Rows filterable to missing-only; the coverage bar reflects the current filter |
| **T-3** | Editing a UI string row writes to `uiTranslationOverrides`, not to the JSON file |
| **T-4** | A `[DEF]` marker distinguishes shipped defaults from CMS overrides, with a one-click revert |
| **T-5** | Export the whole locale to a JSON file, and import a completed file back |
| **T-6** | Import is validated and previewed as a diff before it is applied |
| **T-7** | Coverage per locale is shown on the dashboard and available at `GET /admin/i18n/coverage` |

T-5 matters in practice: it lets a translator work offline in a tool they already use, and it
is how the shipped `es.json`, `fr.json` and `de.json` files are regenerated when the default
translations themselves need to change.

### 9.5 Publication workflow

```
   ┌─────────┐   save    ┌─────────┐   publish    ┌───────────────┐
   │  (new)  │ ────────▶ │  DRAFT  │ ───────────▶ │   PUBLISHED   │
   └─────────┘           └─────────┘              └───────┬───────┘
                              ▲                           │ unpublish
                              │        edit published      │
                              └───────────────────────────┘
                                                          │ archive
                                                          ▼
                                                   ┌───────────────┐
                                                   │   ARCHIVED    │
                                                   └───────────────┘
```

Editing a published entity creates a new DRAFT revision while the previously published
revision continues to serve the public site. Publishing atomically updates
`publishedRevisionId` and evicts the cache. Archiving removes an entity from the public site
but preserves its history.

### 9.6 Dashboard

- **Publication state** — counts by status per content type, with anything left in DRAFT for
  more than seven days highlighted
- **Translation coverage** — a progress bar per locale, linking into the filtered workspace
- **Enquiries** — new count and the five most recent
- **Recent activity** — the last twenty audit entries
- **Health** — API status, cache hit ratio, last successful publish

---

## 10. Internationalisation

### 10.1 What lives where

Applying the ownership rule from §1.5:

| Category | Examples | Storage | Edited by |
|---|---|---|---|
| **UI strings** | `nav.pricing`, `form.required`, `a11y.carouselNext`, `pricing.perMonth` | `public/i18n/{locale}.json`, overridable via `uiTranslationOverrides` | Developer (defaults), EDITOR (overrides) |
| **Content** | Section headings and body copy, service descriptions, plan features, testimonials, FAQ answers | MongoDB, per-locale embedded fields | EDITOR in the CMS |
| **Formatting** | Numbers, dates, currency | Angular `Intl` pipes | Neither — derived from the locale |
| **Not translated** | Person names, organisation name, plan codes, email addresses, phone numbers | Plain strings | — |

Proper nouns are explicitly excluded. "Adwoa Boateng" is not translated into German, and
neither is "Abofonsa BridgeCare" or the plan code `PAWPAW`.

### 10.2 Key namespace

Flat, dot-delimited, grouped by area. Keys are lowerCamelCase and never contain the copy
itself, so wording can change without a key rename.

```
meta.*        languageName, locale, currencyCode
a11y.*        screen-reader-only labels and announcements
nav.*         primary navigation
topbar.*      contact strip labels
common.*      shared button and state labels
hero.*        hero controls (not the copy itself)
services.*    "Available on:", slide counters
pricing.*     "/ month", "Most chosen", included / not included
testimonials.*rating label, plan badge label
faq.*         expand / collapse labels
form.*        field labels, placeholders, validation, option lists, confirmation
footer.*      column headings, rights notice
lang.*        language switcher labels
demo.*        demonstration banner
error.*       page-level error and empty states
```

### 10.3 Loading strategy — defaults plus overrides

This satisfies R7 while keeping copy correctable without a deployment.

```
     ┌────────────────────────────┐        ┌──────────────────────────────┐
     │  /i18n/fr.json             │        │  GET /api/v1/i18n/fr.json    │
     │  shipped default bundle    │        │  CMS overrides from MongoDB  │
     │  versioned with the code   │        │  (usually a handful of keys) │
     └─────────────┬──────────────┘        └──────────────┬───────────────┘
                   │                                      │
                   └──────────────┬───────────────────────┘
                                  ▼
                     deep merge — override wins
                                  ▼
                    Transloco active translation
```

```typescript
// src/app/core/i18n/transloco-http.loader.ts
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getTranslation(lang: string): Observable<Translation> {
    const defaults$  = this.http.get<Translation>(`/i18n/${lang}.json`);
    const overrides$ = this.http.get<Translation>(`${this.base}/i18n/${lang}.json`)
      .pipe(catchError(() => of({})));   // the site must render if the API is unavailable

    return forkJoin([defaults$, overrides$]).pipe(
      map(([defaults, overrides]) => ({ ...flatten(defaults), ...flatten(overrides) })),
    );
  }
}
```

Three properties follow from this design, and all three matter:

1. **The site renders without the API.** If the backend is down, the shipped bundle still
   produces a complete interface.
2. **Corrections do not need a release.** A mistranslated button is fixed in the CMS in
   minutes.
3. **The defaults remain authoritative.** Deleting an override in the CMS reverts to the
   shipped value, so overrides can never permanently obscure the source of truth.

### 10.4 Locale selection and persistence

Resolution order on first load:

1. Path prefix — `/es`, `/fr`, `/de` (explicit and shareable)
2. `abofonsa_locale` cookie from a previous visit
3. `Accept-Language`, matched against supported locales
4. Default: `en`

Switching locale navigates to the corresponding path prefix, so the URL always reflects the
language on screen. `<html lang>` is updated, the cookie is written with a one-year expiry, and
`hreflang` alternates are emitted for all four locales. The cookie is strictly functional and
therefore requires no consent banner under a legitimate-interest analysis; no analytics or
marketing cookies are set anywhere on the site.

### 10.5 Formatting

Prices are stored once as a `Decimal128` and formatted per locale. The currency does not
change with the language — a German-speaking visitor still pays cedis:

| Locale | `GH₵5,000.00` rendered | Notes |
|---|---|---|
| `en` | GH₵5,000.00 | Comma thousands separator |
| `es` | 5.000,00 GH₵ | Full stop thousands, comma decimal, symbol trails |
| `fr` | 5 000,00 GH₵ | Narrow no-break space, symbol trails |
| `de` | 5.000,00 GH₵ | Full stop thousands, symbol trails |

```typescript
{{ plan.priceAmount | currency: 'GHS' : 'symbol' : '1.0-0' : locale() }}
```

Register the additional locale data at bootstrap:

```typescript
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeFr from '@angular/common/locales/fr';
import localeDe from '@angular/common/locales/de';

[localeEs, localeFr, localeDe].forEach(registerLocaleData);
```

Dates use `DatePipe` with the active locale. Ghana observes GMT year-round with no daylight
saving, so all times are rendered in GMT and labelled as such.

### 10.6 Pluralisation

Transloco's message format plugin handles plural categories, which differ by language — French
treats zero and one alike, German does not:

```json
{
  "services.slideCount": "{count, plural, one {# service} other {# services}}",
  "faq.resultCount": "{count, plural, =0 {No questions match} one {# question} other {# questions}}"
}
```

Do not build plurals by string concatenation. Any key whose value varies with a number must
use the plural syntax, and this is checked in review.

### 10.7 Translation file contract

| Property | Rule |
|---|---|
| Location | `web/public/i18n/{locale}.json`, served as static assets |
| Encoding | UTF-8 without BOM, LF line endings |
| Structure | Nested JSON objects mirroring the dot namespace |
| Key parity | Every locale file must contain exactly the same key set as `en.json` — enforced in CI (§11.5) |
| Ordering | Keys sorted alphabetically within each object for reviewable diffs |
| Interpolation | `{{ name }}` double braces, Transloco default |
| Untranslated | Never ship an empty string; if a translation is genuinely pending, omit the key so the fallback applies |
| Review | Changes to `es`/`fr`/`de` require review by a speaker of that language before merge |

The four complete bundles ship alongside this specification as
`i18n-en.json`, `i18n-es.json`, `i18n-fr.json` and `i18n-de.json`; rename to
`{locale}.json` when placing them in `web/public/i18n/`. Appendix A lists `en.json` in full and
shows representative entries from the other three.

---

## 11. Testing strategy

### 11.1 Coverage targets

| Layer | Tooling | Target |
|---|---|---|
| Backend unit | JUnit 5, AssertJ, Mockito | ≥ 80% line coverage on service packages |
| Backend integration | Spring Boot Test + Testcontainers (MongoDB 8.3) | Every endpoint, happy path and failure |
| Frontend unit | Vitest + Angular testing utilities | ≥ 75% on components and services |
| Frontend component | Angular TestBed with harnesses | All 18 section components render from fixture data |
| End-to-end | Playwright | The journeys in §11.3 |
| Accessibility | axe-core via Playwright | Zero serious or critical violations |
| Visual regression | Playwright screenshots | Home page at three viewports, all four locales |

Coverage percentages are a floor, not a goal. A test that asserts a component renders without
asserting *what* it renders satisfies a coverage tool and catches nothing.

### 11.2 Carousel test matrix

Each behavioural requirement from §6.1 has a corresponding test:

| Req | Test |
|---|---|
| C-1 | `next()` at `index = count-1` yields `0`; `prev()` at `0` yields `count-1` |
| C-2 | After each navigation, exactly one dot has `aria-current="true"` |
| C-3 | Dispatch `mouseenter` → assert no advance after `autoplayMs`; dispatch `mouseleave` → assert advance |
| C-4 | Click next mid-interval → assert the next automatic advance is a full interval later |
| C-5 | `ArrowRight` with focus inside advances; `stopPropagation` was called |
| C-6 | Synthetic touch of 60 px advances; 20 px does not |
| C-7 | Non-active slides expose `aria-hidden="true"` and no descendant is tab-reachable |
| C-8 | With `prefers-reduced-motion` matched, no timer is created |
| C-9 | After `fixture.destroy()`, advancing the fake clock triggers no further updates |

### 11.3 End-to-end journeys

1. **Browse and convert** — load home, page through the services carousel, open two FAQ items,
   submit the consultation form, assert the confirmation and that a document exists in MongoDB
2. **Locale switch** — switch to each of `es`, `fr`, `de`; assert `<html lang>`, navigation
   labels, price formatting per §10.5, and the `hreflang` alternates
3. **No authentication on the public site** — crawl every public route and assert no password
   input, no sign-in link and no `Set-Cookie` beyond the functional locale cookie (guards R8)
4. **Editorial round trip** — sign in as EDITOR, change a Spanish service blurb, save, publish,
   reload the public Spanish page, assert the new text appears
5. **Translation fallback** — remove a German field, assert the public German page shows the
   English text rather than an empty element or a raw key
6. **Consent gate** — attempt to publish a testimonial with `consent.obtained: false`, assert
   `409 Conflict` and that the entity stays in DRAFT
7. **Rate limiting** — submit six enquiries from one IP within an hour, assert the sixth is
   rejected with `429`
8. **Revision rollback** — edit, publish, roll back to the prior revision, assert the public
   site reverts

### 11.4 Accessibility testing

axe-core runs against every public route in all four locales, and against the main CMS screens.
The build fails on any serious or critical violation. Automated tooling catches roughly a third
of real accessibility defects, so each release also requires a manual pass: full keyboard
traversal of the page including both carousels and the form, and a screen-reader check of the
carousel and the FAQ accordion.

### 11.5 Translation file checks

A CI step runs on every pull request:

```bash
node scripts/check-i18n.mjs
```

It fails the build if any of the following hold:

- A locale file's key set differs from `en.json` (missing or extra keys)
- Any value is an empty string
- Interpolation placeholders differ between a locale and its English source — for example
  `en` has `{{ name }}` but `fr` has `{{ nom }}`
- A key whose English value uses ICU plural syntax lacks it in another locale
- A file is not valid UTF-8, or keys are not sorted alphabetically

The first two rules catch the common failure of a half-finished translation reaching
production; the third catches a genuinely subtle bug where a translator localises the
placeholder name and the interpolation silently renders empty.

---

## 12. Build, CI/CD and deployment

### 12.1 Local development

```bash
docker compose up -d mongo          # MongoDB 8.3 single-node replica set
cd api  && ./mvnw spring-boot:run   # http://localhost:8080
cd web  && npm start                # http://localhost:4200, proxied to :8080
```

`docker-compose.yml` initialises the replica set — required for transactions — and seeds the
database by running the Mongock changelogs on first API start.

### 12.2 Pipeline

```
push / pull request
   ├── backend:  mvn verify              (unit + Testcontainers integration)
   ├── backend:  OWASP dependency-check  (fail on CVSS ≥ 7)
   ├── frontend: npm ci && npm run lint && npm run test
   ├── frontend: node scripts/check-i18n.mjs
   ├── frontend: npm run build && bundle-size check   (§13.1)
   └── e2e:      playwright test (against compose-provisioned stack)

main branch, all green
   ├── build and push images  ghcr.io/jojoaddison/abofonsa-{api,web}:${SHA}
   ├── deploy to staging
   ├── smoke test staging
   └── manual approval → deploy to production
```

### 12.3 Container images

```dockerfile
# api/Dockerfile
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar
USER app
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseZGC"
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
```

The web image runs the Angular SSR Node server behind nginx. Both containers run as
non-root with a read-only root filesystem and no capabilities.

### 12.4 Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Development | Seeded from changelogs, disposable |
| Staging | UAT and content rehearsal | Anonymised copy of production; enquiries scrubbed |
| Production | Live | Backed up nightly, 30-day retention, restore tested quarterly |

Configuration is environment variables only — `MONGODB_URI`, `JWT_SIGNING_KEY`,
`MEDIA_STORAGE_PATH`, `ALLOWED_ORIGINS`, `BOOTSTRAP_ADMIN_PASSWORD`. No secret is ever
committed, and the bootstrap admin password must be rotated after first login
(`mustChangePassword: true` enforces this).

### 12.5 Rollback

Images are immutable and tagged by commit SHA, so an application rollback is a redeploy of the
previous tag. Content rollback is independent and does not require a deployment: restore the
prior revision through the CMS (§9.5). Database migrations must be additive — a changelog may
add a field or an index but must never drop or rename one in the same release that stops using
it. Removal happens one release later, once the previous version is no longer running.

---

## 13. Non-functional requirements

### 13.1 Performance

| Metric | Target | Measured |
|---|---|---|
| Largest Contentful Paint | < 2.0 s | Simulated Slow 4G, mid-range Android |
| Interaction to Next Paint | < 200 ms | Field data via web-vitals |
| Cumulative Layout Shift | < 0.05 | All images carry explicit `width`/`height` |
| Time to First Byte | < 400 ms | SSR with a warm content cache |
| Initial JS bundle | < 220 KB gzipped | Excludes the lazy `/admin` chunk |
| `GET /content/site` | p95 < 25 ms | Cache hit |
| `GET /content/site` | p95 < 150 ms | Cache miss |

Bandwidth in the target market is the binding constraint, so:

- Images are served as AVIF with WebP and JPEG fallbacks via `<picture>`, sized by `srcset`
- The hero image is preloaded and marked `fetchpriority="high"`; every other image is
  `loading="lazy"` with a `blurHash` placeholder
- Fonts are system-stack only — no web font download at all
- The `/admin` chunk never loads for a public visitor
- Bundle size is asserted in CI; exceeding the budget fails the build

### 13.2 Security requirements

Beyond §7.7:

```
Content-Security-Policy: default-src 'self';
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

`style-src 'unsafe-inline'` is required by Angular Material's runtime style injection. It is
the only relaxation, and it is documented here so that it is not quietly widened later.
Dependencies are scanned on every build and patched within 30 days for high-severity findings,
7 days for critical. Annual penetration testing is recommended before any expansion into
patient-facing functionality.

### 13.3 Privacy and data protection

The site collects personal data through one form and must comply with Ghana's Data Protection
Act, 2012 (Act 843). Where visitors from the EU are expected — plausible given the diaspora
audience — GDPR obligations should be treated as applying.

| Principle | Implementation |
|---|---|
| Lawful basis | Consent for the enquiry form, obtained by an explicit unticked checkbox |
| Minimisation | Name, phone, optional email and free text only; no clinical questions asked |
| Purpose limitation | Enquiry data is used to respond to the enquiry, nothing else |
| Retention | 24 months, enforced by the MongoDB TTL index on `retentionExpiresAt` (§8.2) |
| Access | Enquiries readable only by authenticated staff; every view written to the audit log |
| Erasure | An admin action hard-deletes an enquiry and records the deletion in the audit log |
| Transfer | Data stays in the hosting region; no third-party analytics or advertising |
| Cookies | One functional locale cookie. No tracking cookies, therefore no consent banner |
| Special category data | The free-text field may contain health information — treated as sensitive, excluded from logs, error reports and any export |

> **This is not legal advice.** The retention period, lawful basis and privacy notice should be
> reviewed by a qualified data protection practitioner before launch, particularly because
> health-adjacent enquiries attract a higher standard than ordinary marketing contact forms.

### 13.4 Browser support

| Browser | Version |
|---|---|
| Chrome / Edge | Last 2 major versions |
| Safari (macOS, iOS) | Last 2 major versions |
| Firefox | Last 2 major versions |
| Samsung Internet | Last 2 major versions |
| Opera Mini | Content legible; carousel degrades to a vertical list |

Tailwind 4 relies on modern CSS — cascade layers, `@property`, `color-mix()`. These are
available in all supported browsers. The site must remain readable and navigable with
JavaScript disabled, which SSR provides for free; carousels then render as a static stack of
all slides rather than disappearing.

### 13.5 Observability

- **Health** — `/actuator/health` with liveness and readiness probes
- **Metrics** — Micrometer to Prometheus: request rate, latency percentiles, cache hit ratio,
  MongoDB pool saturation, JVM memory
- **Logging** — structured JSON to stdout with a correlation id propagated via scoped values;
  no personal data in log lines, ever
- **Alerts** — API 5xx rate > 1% over 5 minutes; p95 latency > 500 ms; MongoDB replica lag
  > 10 s; failed logins > 20/minute
- **Uptime** — external check against `/api/v1/health` and the rendered home page every minute

---

## 14. Risks and decision log

### 14.1 Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R-1** | Tailwind Preflight breaks Material component styling | High | Medium | §5.3 mandates layer ordering and omitting Preflight; a visual regression test covers Material controls |
| **R-2** | Material and Tailwind design tokens drift apart | Medium | Medium | Tailwind derives from `--mat-sys-*` (§5.3); brand hexes in templates fail review |
| **R-3** | Translations ship incomplete, leaving raw keys visible | Medium | High | English is mandatory at the schema level; fallback always resolves; CI key-parity check (§11.5) |
| **R-4** | CMS scope grows into a page builder | High | High | Fixed content types; layout changes require a code release. Revisit only with an explicit change request |
| **R-5** | Testimonial published without consent | Low | High | Server-side gate in `PublishingService`, not merely a UI control (§8.2) |
| **R-6** | Enquiry form abused for spam | High | Low | Rate limiting, honeypot, dwell-time check; add a privacy-respecting challenge only if abuse persists |
| **R-7** | Angular 22 is recent; a library in the chain may lag | Medium | Medium | Dependencies are few and mainstream. Angular 21 (supported to May 2027) is a documented fallback |
| **R-8** | Editors overwrite each other's work | Medium | Low | Optimistic locking with `@Version`; conflicts surface a diff (E-9) |
| **R-9** | Media library grows without governance | Medium | Low | `referencedBy` tracking, orphan report, deletion blocked while referenced |
| **R-10** | Free-text enquiry field accumulates health data | Medium | High | Treated as sensitive throughout; TTL deletion; field labelled to discourage clinical detail |

### 14.2 Decisions requiring client confirmation

| # | Question | Default if unanswered |
|---|---|---|
| 1 | Is 24 months the right enquiry retention period? | 24 months |
| 2 | Should the demonstration banner be removed for the production launch? | Removed |
| 3 | Are the four testimonials real, with consent on file? | Treated as placeholder until consent is evidenced |
| 4 | Should prices display in any currency besides GHS? | GHS only |
| 5 | Is a fifth locale anticipated? | Four; the design accommodates more without schema change |
| 6 | Where is media stored — local filesystem or object storage? | Local filesystem behind nginx |
| 7 | Should enquiries also be emailed to the coordination desk? | Stored only; email is a small addition if wanted |

---

## 15. Appendices

### Appendix A — Translation bundles

The four complete files ship with this specification:

| File | Rename to | Keys |
|---|---|---|
| `i18n-en.json` | `web/public/i18n/en.json` | 100 |
| `i18n-es.json` | `web/public/i18n/es.json` | 100 |
| `i18n-fr.json` | `web/public/i18n/fr.json` | 100 |
| `i18n-de.json` | `web/public/i18n/de.json` | 100 |

All four carry an identical key set, verified programmatically. A handful of values are
deliberately identical to English: language endonyms (`lang.en` is "English" in every file, by
design), `meta.currencyCode`, the phone placeholder, the pure-interpolation
`testimonials.planLabel`, and several French terms that genuinely coincide with English
("Contact", "Services", "service"/"services").

**Representative entries across all four locales**

| Key | `en` | `es` | `fr` | `de` |
|---|---|---|---|---|
| `nav.pricing` | Plans and pricing | Planes y precios | Forfaits et tarifs | Tarife und Preise |
| `nav.testimonials` | Testimonials | Testimonios | Témoignages | Erfahrungsberichte |
| `nav.cta` | Request a consultation | Solicitar una consulta | Demander une consultation | Beratung anfragen |
| `pricing.perMonth` | / month | / mes | / mois | / Monat |
| `pricing.mostChosen` | Most chosen | El más elegido | Le plus choisi | Am häufigsten gewählt |
| `services.availableOn` | Available on: | Disponible en: | Disponible avec : | Verfügbar in: |
| `form.required` | This field is required | Este campo es obligatorio | Ce champ est obligatoire | Dieses Feld ist erforderlich |
| `form.name` | Full name | Nombre y apellidos | Nom complet | Vollständiger Name |
| `a11y.skipToContent` | Skip to main content | Saltar al contenido principal | Aller au contenu principal | Zum Hauptinhalt springen |

Note the French `availableOn` — French typography places a space before a colon, and the
translation reflects that. Details of this kind are why §10.7 requires native-speaker review.

### Appendix B — Content mapping from the approved prototype

Every string in `Abofonsa_BridgeCare_Website.html` maps to exactly one destination:

| Prototype element | Destination |
|---|---|
| Demo banner | `demo.banner` (UI string) |
| Top strip phone, email, address | `siteSettings` |
| Navigation labels | `nav.*` (UI strings) |
| Hero eyebrow, heading, "Abofonsa means Angelic Hands", body, 4 stats | `sections` key `hero` |
| Hero badge "Vetted professionals" | `sections.hero.items[]` |
| Four assurance items | `sections` key `assurance` |
| Six service slides — name, blurb, 4 bullets, availability | `services` collection |
| Four process steps | `sections` key `process` |
| Approach heading, lede, 3 features | `sections` key `approach` |
| Four statistics | `sections` key `stats` |
| Angel network heading, lede, 2 features, badge | `sections` key `angel` |
| Three plan cards + comparison table | `plans` collection |
| Four testimonials | `testimonials` collection |
| Seven FAQ entries | `faqs` collection |
| CTA heading and body | `sections` key `cta` |
| Contact details and hours | `siteSettings` |
| Form labels, options, validation | `form.*` (UI strings) |
| Footer column headings | `footer.*` (UI strings) |
| Footer service links | Derived from `services` |
| "A product by jojoaddison" | `footer.productBy` |

### Appendix C — Glossary of collections

| Collection | Documents | Growth |
|---|---|---|
| `services` | 6 | Static |
| `plans` | 3 | Static |
| `testimonials` | 4+ | Slow |
| `faqs` | 7+ | Slow |
| `sections` | 7 | Fixed by code |
| `siteSettings` | 1 | Singleton |
| `uiTranslationOverrides` | ≤ 4 | One per locale |
| `contentRevisions` | Grows with edits | Pruned monthly |
| `media` | Grows with uploads | Governed by orphan report |
| `adminUsers` | < 20 | Static |
| `enquiries` | Grows with traffic | TTL-expired at 24 months |
| `auditLog` | Grows with activity | Archived annually |

### Appendix D — Version sources

Versions in §3.1 were verified against these sources in July 2026:

- Angular releases and support windows — [endoflife.date/angular](https://endoflife.date/angular),
  [HeroDevs Angular version history](https://www.herodevs.com/blog-posts/angular-version-history-every-release-date-support-window-and-end-of-life-date-from-angularjs-to-angular-22)
- Spring Boot 4 and Java 25 support — [Spring Boot 4.0.0 announcement](https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now/),
  [HeroDevs Spring Boot versions](https://www.herodevs.com/blog-posts/spring-boot-versions-eol-dates-and-latest-releases-april-2026),
  [Spring Boot 4 overview](https://www.danvega.dev/blog/spring-boot-4-is-here)
- Tailwind CSS v4 and Angular integration — [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4),
  [Angular Tailwind guide](https://angular.dev/guide/tailwind),
  [Nx: Tailwind 4 with Angular](https://nx.dev/blog/setup-tailwind-4-angular-nx-workspace)
- Angular Material 3 system tokens — [Angular Material theming](https://angular.love/angular-material-theming-application-with-material-3),
  [Material 3 design tokens](https://konstantin-denerz.com/angular-material-3-theming-design-tokens-and-system-variables/)
- Runtime i18n library comparison — [SimpleLocalize Angular i18n guide](https://simplelocalize.io/blog/posts/angular-i18n-guide/),
  [Phrase: Angular i18n libraries](https://phrase.com/blog/posts/best-libraries-for-angular-i18n/)
- MongoDB releases — [endoflife.date/mongodb](https://endoflife.date/mongodb),
  [MongoDB release notes](https://www.mongodb.com/docs/manual/release-notes/)

Re-verify before the project starts: framework versions move quickly, and Angular in
particular ships a major release roughly every six months.

---

*End of specification.*

