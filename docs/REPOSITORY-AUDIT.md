# Wendy's Bakehouse Repository Audit

**Audit date:** 2026-09-29  
**Scope:** application code, database/deployment assets, security controls, delivery tooling, and repository documentation  
**Method:** static review plus local TypeScript, ESLint, production-build, dependency-audit, and repository-structure checks. No live production, Supabase, Stripe, Google Maps, browser, load, or penetration testing was performed.

## 1. Executive assessment

This is a **full-stack, server-rendered, business-to-consumer commerce and order-management web application** for a made-to-order bakery. It combines a public catalogue/storefront with a staff-only operations console. It is not a conventional inventory-and-shipping platform: the primary workflow is configuration-heavy, date-sensitive bakery ordering with deposits, pickup/delivery, manual transfer verification, WhatsApp handoff, and optional Stripe Checkout.

The solution has a sound domain core for its current scale. In particular, server-authoritative pricing, a shared order/payment state machine, centralized order creation, database privilege restrictions, signed Stripe webhooks, and immutable order snapshots are all strong design choices. The codebase is materially more security-aware than a typical small-business storefront.

However, it is **not yet enterprise-operationally ready**. The current branch has no automated tests or CI, repository-wide lint fails with 646 findings (639 errors and 7 warnings), TypeScript validation fails, generated route metadata was stale at the start of the audit, and the production bundle has a 672.84 kB client chunk. Public order/preview/card endpoints also have no visible application-level rate limiting or abuse control. Documentation and deployment configuration disagree with the mandated Bun workflow.

### Overall rating

| Dimension           | Rating              | Summary                                                                                                                                                                    |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product capability  | **Strong MVP**      | End-to-end catalogue, bespoke configuration, checkout, payments, delivery, and administration are represented.                                                             |
| Architecture        | **Good**            | Clear server/client boundaries and valuable domain centralization; several oversized modules and dual migration paths raise maintenance cost.                              |
| Security design     | **Good foundation** | RLS/privilege hardening, server pricing, CSRF, role checks, upload validation, and webhook verification are present; abuse protection and operational verification remain. |
| Quality engineering | **High risk**       | No tests or CI; type-check and lint are red. A successful bundle does not compensate for failed static gates.                                                              |
| Operations          | **Developing**      | Deployment instructions and environment inventory exist, but there is no checked-in observability, SLO, backup/restore evidence, or release automation.                    |
| Maintainability     | **Moderate risk**   | Good domain boundaries coexist with 500–760-line feature files, generated-code formatting noise, and deprecated APIs.                                                      |

**Recommendation:** treat the system as a production-capable MVP undergoing stabilization, not as a mature enterprise commerce platform. Pause net-new feature work for a short, time-boxed reliability sprint.

## 2. Project and technology profile

- **Application type:** responsive bakery storefront plus protected back-office administration console.
- **Rendering/runtime:** TanStack Start SSR on Vite/Nitro, with a Cloudflare-oriented Nitro build and Vercel deployment metadata.
- **Front end:** React 19, TypeScript, TanStack Router/Query, Tailwind CSS v4, Radix/shadcn UI, React Hook Form, Zod, Lucide, Sonner, and Recharts.
- **Back end:** TanStack server functions and route handlers; server-only modules are dynamically loaded.
- **Data/auth/storage:** Supabase Postgres, Auth, Storage, RLS, RPCs, and a service-role server client.
- **Payments:** manual bank transfer, WhatsApp handoff, and optional Stripe Checkout with signed webhook settlement.
- **Delivery:** pickup, configured fixed zones, or optional Google Maps distance-based pricing.
- **Package manager:** Bun, despite stale npm commands in `README.md` and `vercel.json`.
- **Schema management:** SQL deployment scripts for fresh/upgrade installs plus historical Drizzle migrations; Drizzle's schema file is intentionally empty.

## 3. Functional inventory

### 3.1 Customer storefront

1. Branded, SEO-described home page with product highlights, ordering steps, testimonials, and calls to action.
2. Catalogue browsing by category, including availability and catalogue-driven imagery.
3. Product detail routes with selectable option groups, multi-select support, notes, quantity, price display, and lead-time information.
4. Persistent browser basket, quantity editing, item removal, and basket drawer/page.
5. Server-priced cart previews; the browser renders authoritative totals rather than calculating prices.
6. Checkout capture for customer identity, contact details, event/occasion, allergies, date/window, fulfillment method, delivery location, and notes.
7. Product and cake-option validation, including stable custom-cake rules, minimum prices, tier/size rules, and deposit calculation.
8. Pickup, fixed-zone delivery, and distance-based delivery modes.
9. Three checkout paths:
   - WhatsApp order handoff;
   - bank transfer with payer/reference/date and optional payment-slip upload;
   - Stripe-hosted card checkout when configured.
10. Payment/order confirmation state lookup after Stripe redirect.
11. Public informational routes for pricing, story, contact, and ordering/pickup policies.
12. Private product-image delivery through a server route backed by Supabase Storage.

### 3.2 Administrative console

1. Supabase email/password staff sign-in and authenticated route group.
2. Server-side admin/staff authorization via database RPCs.
3. Dashboard metrics for order volume/value, pending verification, upcoming work, and recent activity.
4. Order and payment queues with detailed customer, fulfillment, pricing, payment, and item snapshots.
5. Controlled order/payment status updates using the shared transition model; Stripe-owned payment states are protected from manual mutation.
6. Signed access to private bank-transfer slips.
7. Product management: content, price, lead time, availability/archive status, payment rule, deposit percentage, category, and images.
8. Product option-group and option-choice management with stable-key protections for canonical custom-cake rules.
9. Category management with canonical-category protections.
10. Store settings, bank details, delivery mode, origin, distance bands, and fixed delivery zones.

### 3.3 Platform and security functions

1. Global CSRF middleware for server functions.
2. SSR and server-function error normalization with a customer-safe error page and Lovable reporting bridge.
3. Zod validation for order inputs and payment slips, including MIME-type and 5 MB limits.
4. Centralized order creation and integer-cent pricing.
5. Immutable price/option/delivery snapshots on order items and orders.
6. Explicit order and payment lifecycle transitions.
7. Stripe signature verification, idempotent/optimistic state updates, expired-session handling, and full-refund handling.
8. Row-level security and explicit table/function privilege revocation for browser roles.
9. Environment-gated Stripe and distance-delivery functionality.

## 4. Strengths (pros)

### Business and product

- **Good fit to the actual operating model.** The software supports bespoke cakes, lead times, deposits, transfer evidence, and pickup windows rather than forcing the bakery into a generic shipping cart.
- **Graceful payment optionality.** The business can operate via WhatsApp/bank transfer without Stripe, while card payment can be enabled through configuration.
- **Useful admin coverage.** Catalogue, categories, configuration options, delivery, order workflow, and verification are manageable without direct database editing.
- **Snapshot-based orders.** Historical orders retain the commercial terms selected at checkout even if the catalogue later changes.

### Engineering and security

- **Server-authoritative money.** Integer cents and centralized server pricing substantially reduce tampering and rounding risks.
- **One order-creation path.** All payment methods converge on the same pricing and persistence flow, limiting inconsistent business logic.
- **Explicit lifecycle enforcement.** Order/payment transitions are centralized and checked by both administrative and Stripe paths.
- **Defense in depth around data.** The service-role key remains server-side, public roles are denied privileged writes, protected RPC execution is restricted, and staff roles are resolved on the server.
- **Strong Stripe ownership model.** The webhook—not the browser return page—settles payment, and signature validation plus compare-and-swap updates make retries safer.
- **Reasonable upload controls.** Receipt types and size are validated; server-derived paths avoid trusting filenames.
- **Failure-aware SSR.** The custom server wrapper addresses swallowed framework errors and avoids exposing raw exceptions to users.
- **Build reproducibility.** A lockfile and a supply-chain minimum-age policy are present.

## 5. Weaknesses, risks, and evidence

### P0 — release blockers

1. **The static quality gate is red.** `bunx tsc --noEmit` fails because the root error boundary declares `error: Error` while the router supplies `unknown`. Before the build regenerated routes, the type-check also rejected `/contact` because the committed generated route tree was stale.
2. **Repository-wide lint is unusable as a gate.** `bun run lint` reports 646 findings: 639 errors and 7 warnings, predominantly Prettier drift, including generated Supabase types. A gate that is permanently red cannot prevent regressions.
3. **There is no automated test suite or CI workflow.** Pricing, deposits, state transitions, authorization, checkout creation, and webhook reconciliation are financially sensitive yet rely on manual validation and historical checkpoint notes.

**Business impact:** a developer can merge a regression in price calculation, status transitions, permissions, or route generation without an automated stop. This is the immediate priority.

### P1 — high priority

4. **Public mutation/cost endpoints lack visible abuse controls.** Order placement, cart preview, and Stripe session creation are publicly callable, and distance quotes may invoke a paid Google API. No rate limiter, bot challenge, request quota, or per-client throttling is present in the application code. This enables database spam, orphaned Stripe objects, operational noise, and third-party API cost amplification.
5. **Production bundle size is high.** The main client chunk is 672.84 kB minified (194.71 kB gzip), triggering Vite's chunk-size warning. This can materially affect mobile conversion and Core Web Vitals.
6. **Deployment instructions are contradictory.** Repository instructions mandate Bun, while `README.md` tells developers to use npm and `vercel.json` explicitly runs npm. This increases lockfile drift and “works on my machine” risk.
7. **Framework API debt is already warning.** The build reports 18 uses of deprecated `createServerFn().inputValidator()`; these should migrate to `.validator()` before a dependency upgrade makes them breaking changes.
8. **Database change ownership is ambiguous.** Fresh/upgrade SQL lives under `deploy/supabase`, historical incremental changes live under `drizzle/migrations`, and the Drizzle schema is intentionally blank. Without one authoritative, repeatable migration ledger, environment drift and partial upgrades are likely.
9. **Order reference generation is weak for a public lookup key.** References use a six-digit `Math.random()` suffix and year prefix, with collision handling delegated to a database failure. The public payment-state lookup returns financial amounts to anyone who knows a reference. The data exposed is limited, but references should be generated with a cryptographically strong, adequately large identifier or paired with a second secret.

### P2 — medium priority

10. **Critical modules are too large.** Checkout (764 lines), admin server functions (740), pricing (516), and several admin components (369–487) combine validation, orchestration, rendering, and mutations. This inhibits review and focused testing.
11. **Observability is insufficient for enterprise operations.** Logging is console-based and Lovable-specific client reporting is best-effort. There is no repository evidence of structured logs, correlation IDs, alerting, error budgets, payment reconciliation jobs, or operational dashboards.
12. **No checked-in security headers policy is visible.** The application sets response content types and cache controls where needed, but no explicit CSP, HSTS, frame-ancestor, referrer, or permissions policy is maintained in the repository. Hosting defaults should not be assumed.
13. **SEO plumbing is incomplete.** Metadata exists and `robots.txt` allows crawlers, but no sitemap, canonical URL strategy, or structured business/product data is checked in.
14. **Privacy/compliance documentation is incomplete.** Customer names, phone numbers, emails, addresses/postal codes, allergies, and payment evidence are collected. The public policies page focuses on ordering; the repository does not demonstrate a privacy notice, retention schedule, data-subject request process, or deletion policy.
15. **Accessibility and browser behavior are unverified.** Radix primitives and semantic patterns are a positive base, but no automated accessibility checks, keyboard regression checks, or supported-browser matrix exists.
16. **Operational resilience is undocumented.** There is no automated evidence for database backups, restore drills, secret rotation, incident response, Stripe reconciliation, or rollback procedures.

### P3 — lower priority / hygiene

17. **Repository identity and onboarding are stale.** The package name is generic, and the README begins as an old research mission rather than a current developer/operator guide.
18. **The linter includes generated files without a sustainable formatting policy.** Either generated artifacts should match the formatter or be excluded; leaving hundreds of known errors masks real lint defects.
19. **Build warnings are noisy.** Vite plugin deprecation, module-directive, and bundler configuration warnings make it harder to notice a new warning that matters.

## 6. Recommended target state

### First 48 hours — restore trust in releases

1. Fix the root error-boundary type and regenerate/commit the route tree through the supported generator.
2. Establish a clean lint baseline. Exclude only genuinely generated artifacts; format owned source rather than broadly disabling rules.
3. Add scripts for `typecheck`, `test`, and a non-mutating `format:check`.
4. Add CI on every pull request and protected-branch push: frozen Bun install, format check, lint, type-check, unit/integration tests, and production build.
5. Add a minimal high-value test pack before new features:
   - pricing and custom-cake minimums/options;
   - deposit/full-payment calculations;
   - order/payment transition table;
   - order input and slip validation;
   - Stripe completion, expiry, duplicate, out-of-order, and refund events;
   - admin/staff/anonymous authorization boundaries.

### First 2 weeks — reduce production exposure

1. Add layered rate limiting to public server functions and API routes, with stricter limits on order creation, card-session creation, and paid distance lookup. Add bot mitigation only where telemetry shows need.
2. Replace public reference-only payment lookup with a high-entropy lookup token; use database-generated, collision-safe public references.
3. Exercise the documented residual security drills against staging: anonymous REST denial, Stripe test event matrix, slip access, price tampering, and legacy database upgrade rehearsal.
4. Define explicit security headers, beginning with a report-only CSP and then enforcing it after inventorying Stripe, Supabase, Google Fonts, and Lovable origins.
5. Split the largest modules by business capability while preserving central pricing and state-transition ownership.
6. Correct README/Vercel/package-manager documentation and choose one authoritative database migration mechanism with an environment/version ledger.

### First 30–60 days — enterprise operating controls

1. Introduce structured logging with request/order/event correlation and redaction of PII and secrets.
2. Add alerts for webhook failures, repeated checkout failures, unusual order volume, database errors, and payment reconciliation mismatches.
3. Document SLOs and runbooks for ordering availability, payment handling, incident response, rollback, backup restore, and secret rotation.
4. Add scheduled reconciliation between Stripe and local paid/refunded states.
5. Establish data classification, retention, deletion, and privacy-request procedures; publish an appropriate privacy notice with legal review.
6. Performance-budget the storefront, lazy-load noncritical code, analyze the 672.84 kB entry chunk, and measure real Core Web Vitals.
7. Add Playwright smoke tests for browse → configure → basket → each checkout path, plus admin authentication and order review.
8. Add accessibility automation (for example axe in browser tests) and a periodic manual WCAG 2.2 AA review.

## 7. Advice: do and do not

### Do

- Keep prices as integer cents and keep all authoritative calculation in `pricing.server.ts`.
- Keep every checkout method flowing through the shared order-creation service.
- Preserve immutable order snapshots; never rebuild historical totals from today's catalogue.
- Continue dynamically importing `.server.ts` modules inside handlers to protect client bundles.
- Enforce staff/admin roles server-side and retain database privilege/RLS defense in depth.
- Treat Stripe webhooks as the source of truth for card settlement and make every event handler replay-safe.
- Use additive, reviewed database migrations; rehearse upgrades against a restored production-like copy.
- Make CI green and mandatory before expanding product scope.
- Redact customer, payment, token, and slip data from logs and support tooling.
- Measure conversion, checkout failure rate, payment failure rate, and operational processing time before optimizing features.

### Do not

- Do not calculate or trust product, option, deposit, delivery, or total amounts in the browser.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, signed slip URLs, or raw provider errors to the client.
- Do not let a customer return page mark an order paid.
- Do not bypass the shared order/payment transition model with ad hoc database updates.
- Do not add a second schema source of truth or edit generated Supabase/route files manually.
- Do not solve current lint failures by globally weakening safety rules or ignoring all source files.
- Do not enable card payments in production until webhook delivery, retries, refunds, expiry, and reconciliation are tested in Stripe test mode.
- Do not collect customer data indefinitely; retention must follow a documented business/legal purpose.
- Do not force-push, rebase, amend, or squash already-published history because the branch is synchronized with Lovable.
- Do not interpret a successful production bundle as proof that the application is type-safe, secure, or release-ready.

## 8. Immediate next action

**Open and complete a “Green Quality Gate” stabilization change before any feature work.** Its acceptance criterion is one clean command sequence on a fresh checkout:

```sh
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build
```

That change should fix the current TypeScript error, regenerate route metadata, establish the generated-file lint policy, add the missing scripts/CI workflow, and introduce the first tests for pricing and state transitions. This is the highest-leverage action because it converts the existing strong domain/security design into a repeatable release control and makes every subsequent recommendation safer to implement.

## 9. Audit limitations

- No production credentials or live customer data were accessed.
- No claims are made about the current hosting dashboard, Supabase dashboard toggles, backup settings, Stripe account configuration, DNS, or production environment variables.
- The dependency audit command available in this environment did not support `bun audit`; dependency vulnerability status remains unverified and should be checked with a supported scanner in CI.
- A build can generate route metadata, so results differ before and after the build. CI should deliberately run generation before a non-mutating type-check, or verify that generated output is already committed and current.
- Legal, tax, privacy, accessibility, and payment-compliance recommendations require validation by qualified specialists for the bakery's operating jurisdictions.
