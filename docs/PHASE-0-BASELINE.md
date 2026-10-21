# Phase 0 — Repository Baseline Reconstruction

**Assessment date:** 2026-09-30  
**Scope:** diagnostic and documentary work only  
**Repository state assessed:** commit `97f4811` on branch `work`

## 1. Executive baseline

Wendy's Bakehouse is a full-stack, server-rendered bakery storefront and staff operations console. It is built with TanStack Start, React 19, TypeScript, Vite/Nitro, Tailwind CSS, and Supabase, with optional Stripe and Google Maps integrations.

The earlier repository audit is directionally sound, but the repository is not at a green release baseline. The production build succeeds, while formatting, lint, and type checking fail. There is no test command and no checked-in CI workflow. A frozen dependency install could not be verified in this environment because the npm registry returned HTTP 403 for `js-yaml`; this is an environment/network result, not evidence that the lockfile itself is invalid.

No application behavior was changed in Phase 0. In particular, no navigation item, generated route metadata, quality script, test, CI workflow, security control, or business rule was modified.

## 2. Current repository health

| Check                                 | Result                               | Classification         | Evidence                                                                                                                                                        |
| ------------------------------------- | ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`       | HTTP 403 resolving `js-yaml`         | **NOT VERIFIABLE**     | Registry access failed before the install could establish lockfile reproducibility.                                                                             |
| `bunx prettier --check .`             | 38 files reported                    | **FAIL**               | The failures span owned source, documentation, Lovable plans, generated asset metadata, and generated Supabase integration files.                               |
| `bun run lint`                        | 646 findings: 639 errors, 7 warnings | **FAIL**               | 638 errors are auto-fixable; most errors are from the Prettier ESLint rule.                                                                                     |
| `bunx tsc --noEmit` before generation | 2 errors                             | **FAIL**               | The root error boundary narrows `unknown` to `Error`, and `/contact` is absent from the committed generated route tree.                                         |
| `bun run build`                       | Completed                            | **PASS WITH WARNINGS** | The build generated `/contact` route metadata, reported 18 deprecated `.inputValidator()` calls, and emitted a 672.80 kB minified entry chunk (194.68 kB gzip). |
| Test command                          | No `test` script exists              | **FAIL**               | `package.json` exposes dev, build, preview, lint, and mutating format commands only.                                                                            |
| Format-check command                  | No `format:check` script exists      | **FAIL**               | Prettier can be invoked manually but is not exposed as the required quality command.                                                                            |
| Type-check command                    | No `typecheck` script exists         | **FAIL**               | TypeScript can be invoked manually but is not exposed as the required quality command.                                                                          |
| CI                                    | No `.github` workflow is checked in  | **FAIL**               | No repository automation enforces installation, format, lint, types, tests, or build.                                                                           |

### Route-generation state

The committed `src/routeTree.gen.ts` is stale: `src/routes/contact.tsx` exists but `/contact` is absent from the committed tree. Running the supported Vite build regenerated the missing import, route node, type registrations, and root child. That diagnostic output was deliberately reverted because committing generated metadata belongs to Phase 1. This independently confirms the earlier audit finding and explains one of the two current TypeScript errors.

### Build state

The production client, SSR, and Nitro builds complete. This proves that bundling currently works; it does not prove type safety or release readiness. The build also confirms:

- 18 deprecated `createServerFn().inputValidator()` usages;
- a 672.80 kB main client chunk exceeding Vite's 500 kB warning threshold;
- module-level directive warnings from dependencies; and
- generation of an asset-cache `_headers` file containing no general application security-header policy.

## 3. Audit-finding verification matrix

| Prior finding                                         | Classification                      | Phase 0 conclusion                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript is red                                     | **CONFIRMED**                       | Two pre-generation errors reproduce: root error-boundary variance and stale `/contact` route typing.                                                                                                                                                                                 |
| Lint is red with 646 findings                         | **CONFIRMED**                       | Exact result reproduced: 639 errors and 7 warnings.                                                                                                                                                                                                                                  |
| No automated tests or CI                              | **CONFIRMED**                       | No test script, test files/configuration, or `.github` workflow was found.                                                                                                                                                                                                           |
| No visible public-endpoint abuse controls             | **CONFIRMED (STATIC SCOPE)**        | No application rate limiter, throttle, quota, or challenge was found around order creation, cart preview, card session creation, or public lookup. Upstream controls remain unverified.                                                                                              |
| Main bundle is large                                  | **CONFIRMED**                       | Current build reports 672.80 kB minified and 194.68 kB gzip.                                                                                                                                                                                                                         |
| Bun instructions conflict with deployment docs        | **CONFIRMED**                       | repository policy and lockfiles require Bun, while `README.md` and `vercel.json` specify npm.                                                                                                                                                                                        |
| Deprecated server-function API usage                  | **CONFIRMED**                       | The build reports 18 `.inputValidator()` deprecations.                                                                                                                                                                                                                               |
| Database change ownership is ambiguous                | **CONFIRMED**                       | Fresh-install SQL lives in `deploy/supabase`, historical migrations and a ledger live in `drizzle/migrations`, and Drizzle points to an intentionally empty schema. The intended split is documented in repository instructions but is not an unambiguous future migration workflow. |
| Public reference-only payment lookup is weak          | **CONFIRMED**                       | References use a six-digit `Math.random()` suffix; lookup accepts only the reference and returns payment and monetary state. Database uniqueness detects rather than retries collisions.                                                                                             |
| Critical modules are oversized                        | **CONFIRMED**                       | Checkout is 764 lines, admin functions 740, pricing 516, and major admin components range up to 487 lines. Size alone does not authorize refactoring.                                                                                                                                |
| Observability is insufficient                         | **CONFIRMED (REPOSITORY EVIDENCE)** | Console and Lovable reporting exist; structured logs, correlation, alerting, reconciliation, and SLO artifacts were not found. External systems remain unverified.                                                                                                                   |
| No checked-in security-header policy                  | **CONFIRMED**                       | Generated headers configure immutable asset caching only. Hosting-level headers remain unverified.                                                                                                                                                                                   |
| SEO plumbing is incomplete                            | **CONFIRMED (REPOSITORY EVIDENCE)** | Page metadata exists; no sitemap, canonical strategy, or structured-data implementation was found.                                                                                                                                                                                   |
| Privacy/compliance documentation is incomplete        | **CONFIRMED (REPOSITORY EVIDENCE)** | Customer and payment-evidence data are collected, but repository-level retention, deletion, and privacy-process documentation was not found. Legal compliance itself is not assessed.                                                                                                |
| Accessibility/browser behavior is unverified          | **CONFIRMED AS UNVERIFIED**         | Accessible primitives and labels exist, but no automated accessibility suite, keyboard regression suite, or browser matrix was found.                                                                                                                                                |
| Operational resilience is undocumented                | **CONFIRMED (REPOSITORY EVIDENCE)** | No checked-in backup/restore drills, incident process, rollback runbook, or secret-rotation procedure was found. Provider configuration remains unverified.                                                                                                                          |
| Repository identity/onboarding is stale               | **CONFIRMED**                       | The package retains a generic name and the README primarily contains an obsolete research mission plus npm onboarding.                                                                                                                                                               |
| Generated files lack a sustainable lint/format policy | **CONFIRMED**                       | The current formatter/linter traverses generated Supabase and asset metadata and contributes substantial baseline noise.                                                                                                                                                             |
| Build warnings are noisy                              | **CONFIRMED**                       | Deprecation, large-chunk, and dependency directive warnings reproduce.                                                                                                                                                                                                               |

### Corrections to the earlier audit plan

The earlier audit placed a broad pricing, payment-state, webhook, and authorization test pack inside its immediate 48-hour quality-gate recommendation. Under the now-governing phase boundaries, those behavioral tests belong to **Phase 2**, not Phase 1. Phase 1 should add only the minimum test needed to prove that the test runner and quality infrastructure execute real checks.

The previous wording also described the route tree as stale only “at the start of the audit.” It remains stale in the committed baseline at `97f4811`; a build repairs it in the working tree, but the generated change has not been committed.

## 4. Architecture and dependency map

### Request and rendering path

```text
Browser
  -> TanStack Router file routes (`src/routes`)
  -> React storefront/admin components (`src/components`)
  -> TanStack server functions (`src/lib/*.functions.ts`)
  -> dynamically imported server-only services (`*.server.ts`)
  -> Supabase Auth/Postgres/Storage and optional Stripe/Google Maps

Nitro SSR
  -> `src/server.ts` error-normalizing wrapper
  -> `src/start.ts` error + CSRF middleware
  -> generated route tree (`src/routeTree.gen.ts`)
```

### Domain ownership

| Concern               | Authoritative location                                                     | Consumers / notes                                                      |
| --------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Routes and SSR        | `src/routes`, `src/router.tsx`, `src/start.ts`, `src/server.ts`            | Route tree is generated, never hand-edited.                            |
| Catalogue reads       | `src/lib/catalog.functions.ts`                                             | Public storefront routes and components.                               |
| Basket state          | `src/lib/cart.tsx`                                                         | Browser persistence and UI only; not pricing authority.                |
| Input contracts       | `src/lib/order-schemas.ts`, `src/lib/custom-cake-contract.ts`              | Shared validation and stable custom-cake keys.                         |
| Pricing               | `src/lib/pricing.server.ts`                                                | Server-only source of monetary truth, using integer cents.             |
| Order creation        | `src/lib/order-create.server.ts`                                           | Shared by WhatsApp, transfer, and Stripe paths.                        |
| Lifecycle rules       | `src/lib/order-status.ts`                                                  | Used by admin UI and enforced by server mutations.                     |
| Public orders         | `src/lib/orders.functions.ts`                                              | Place order, preview basket, and payment-state lookup.                 |
| Card payments         | `src/lib/payments.functions.ts`, `src/routes/api/public/stripe-webhook.ts` | Checkout creation plus signed webhook settlement.                      |
| Administration        | `src/lib/admin.functions.ts`, `src/components/admin`, authenticated routes | Server functions resolve and enforce roles.                            |
| Data/auth/storage     | `src/integrations/supabase`                                                | Generated clients/types plus server service-role client.               |
| Database setup        | `deploy/supabase/*.sql`                                                    | Fresh-install sequence and cake-pricing upgrade script.                |
| Historical migrations | `drizzle/migrations`                                                       | Separate journaled changes; future ownership needs Phase 4 resolution. |

### Route and menu map

The public routes are home, menu index/detail, pricing, about, contact, cart, checkout, order confirmation, policies, and authentication. The current desktop/mobile primary menu exposes:

1. **Cakes & treats** → `/menu` with no category;
2. **Pastries** → `/menu?category=pastries`;
3. **Menu & pricing** → `/pricing`;
4. **Our story** → `/about`;
5. cart; and
6. **Start an order** → `/menu`.

The admin menu exposes Dashboard, Orders, Payments, Products, Collections, and Settings. These labels accurately match existing routes and capabilities.

## 5. Menu recommendation — no implementation in Phase 0

The current approach duplicates two concepts: **Cakes & treats** and **Menu & pricing** can both read as the product catalogue, while the first item routes to all products rather than a cakes/treats-only view. A separate top-level **Pastries** item does not scale if more collections are added.

Recommended public information architecture:

1. **Shop** → `/menu` (single catalogue entry point);
2. **Pricing guide** → `/pricing` (retain only if it explains bespoke cake tiers beyond catalogue prices);
3. **How to order** → `/policies` initially, with the label focused on customer intent;
4. **Our story** → `/about`;
5. **Contact** → `/contact`;
6. cart; and
7. primary CTA **Start an order** → `/menu`.

Recommended modification rather than adding every category to the global menu: keep Cakes, Pastries, Cupcakes, Meat Pies, and future collections as catalogue filters on `/menu`. This keeps the header stable as inventory evolves. If analytics later show one collection dominates customer intent, promote only that collection into a temporary featured link.

No admin menu addition is recommended until a real operational capability and route exist. Specifically, do not add placeholder links for Customers, Reports, Staff, Discounts, Inventory, or Audit Logs. Candidate future items should be justified by workflows and authorization design, not by empty navigation symmetry.

Implementation of this recommendation is intentionally deferred. It requires explicit authorization for the phase that permits navigation/UX work and should include active-state behavior, responsive keyboard behavior, route-generation verification, analytics assumptions, and a browser screenshot.

## 6. Protected business and security invariants

The following constraints must survive every remediation phase:

1. Money remains integer cents and authoritative pricing remains exclusively in `src/lib/pricing.server.ts`.
2. The browser may preview amounts but may not authoritatively calculate or submit trusted totals.
3. WhatsApp, bank-transfer, and card checkouts continue through `src/lib/order-create.server.ts`.
4. Historical orders retain price, option, and delivery snapshots even after catalogue changes.
5. Order and payment status values and allowed transitions remain centralized in `src/lib/order-status.ts` and enforced server-side.
6. Stripe webhook verification—not the customer return route—controls paid/refunded/expired card state.
7. Duplicate and out-of-order Stripe events must not create invalid state transitions.
8. Staff/admin authorization is established server-side through trusted role checks; browser state is not authority.
9. `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, webhook secrets, and Google API credentials remain server-only.
10. `.server.ts` modules remain dynamically imported from code that can enter client bundles.
11. CSRF middleware in `src/start.ts` remains installed for server functions.
12. Payment slips and product assets retain their intended privacy, validation, and signed-access controls.
13. Public roles retain database least privilege and RLS protections.
14. `src/routeTree.gen.ts` and Supabase-generated integration files are generated through supported tooling, not manually edited.
15. Published Lovable-connected history is not rewritten.

## 7. Proposed Phase 1 changes

These are proposals only and require explicit **Phase 1 authorization**:

1. Regenerate and commit the route tree through supported TanStack/Vite tooling so `/contact` is represented.
2. Correct the root error-boundary parameter contract without changing visible error behavior.
3. Define a deliberate Prettier scope and generated-file policy; format owned files rather than weakening safety rules globally.
4. Reduce lint to a meaningful, passing baseline, addressing warnings deliberately and excluding only genuinely generated artifacts where justified.
5. Add non-mutating `format:check`, `typecheck`, and real `test` scripts while retaining the existing mutating `format` command.
6. Add only a minimal infrastructure smoke test proving the selected runner discovers, executes, and fails tests correctly. Defer business-rule coverage to Phase 2.
7. Add CI that runs the exact required sequence on Bun: frozen install, format check, lint, type check, test, and production build.
8. Make route generation order explicit so type checking is deterministic on a clean checkout, and verify generated output is committed/current.
9. Reconcile Bun usage in the quality-gate execution path only where necessary for reproducibility; broader onboarding documentation remains outside Phase 1 unless expressly included.

## 8. Clarifications required before implementation

1. **Phase authorization:** Phase 1 must be explicitly authorized before any quality-gate implementation begins.
2. **Menu authorization:** identify which later phase is authorized to implement the recommended navigation change; Phase 0 cannot modify the runnable UI.
3. **Menu objective:** confirm whether “menu items” means public website navigation, admin navigation, catalogue collections/products, or all three.
4. **Public IA:** confirm whether `/pricing` contains intentionally distinct content from `/menu`; if not, consolidation may be preferable to retaining both links.
5. **Formatting ownership:** confirm whether `.lovable/plan`, checked-in asset metadata, and generated Supabase files are expected to be formatter-compliant or excluded from checks.
6. **CI provider/branch policy:** GitHub Actions is the apparent default, but required branches and whether Lovable-generated commits must pass the same gate need confirmation.
7. **Test runner:** confirm whether adding a test dependency is acceptable under the Bun minimum-release-age policy, or whether Bun's built-in test runner is preferred.
8. **Install failure:** the registry HTTP 403 must be rechecked in normal CI/network conditions before classifying frozen installation as a repository defect.
9. **Migration ownership:** future database migration placement is intentionally deferred to Phase 4 and must not be decided during Phase 1.
10. **External controls:** hosting headers, WAF/rate limits, backup policy, Supabase settings, and alerting need operator evidence before their absence can be asserted beyond the repository.

## 9. Phase 0 acceptance assessment

| Acceptance criterion                                            | Result   |
| --------------------------------------------------------------- | -------- |
| Current repository health baseline                              | **PASS** |
| Verified audit findings                                         | **PASS** |
| Confirmed/invalidated finding classification                    | **PASS** |
| Architecture and dependency map sufficient for safe remediation | **PASS** |
| List of protected invariants                                    | **PASS** |
| List of proposed Phase 1 changes                                | **PASS** |
| List of issues requiring clarification before implementation    | **PASS** |

Phase 0 is complete. No Phase 1 or later-phase implementation has begun.
