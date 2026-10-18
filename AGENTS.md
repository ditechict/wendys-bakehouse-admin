<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Work continuity and release order

Before resuming work, proposing milestones, merging or publishing, read `deploy/WORK-CHECKLIST.md`. It records the agreed task order, approvals, evidence, unfinished work and next action. Update it before authentication/approval handoffs and after meaningful progress. Recover missing context before reconstructing a plan; never infer whole-project readiness from a narrow test. Keep product-category and browser verification scopes explicit. The agreed order is admin alignment, product images in batches, then production publication. Publication is currently on hold. These are project instructions, not a claim that ChatGPT system memory was updated.

## Stack

- TanStack Start + Vite (React 19, TypeScript, Tailwind v4, shadcn/ui "new-york"). Not Next.js.
- Do not create `src/pages/`, `app/layout.tsx`, or import `server-only` (eslint blocks it). The only root layout is `src/routes/__root.tsx`.
- `package.json` name is `tanstack_start_ts`; the actual app is "Wendy's Bakehouse" (storefront + admin console).

## Commands

- Package manager is **bun** (`bun.lock` + `bunfig.toml` are committed; README/`vercel.json` still say npm — don't trust them).
- `bun run dev` / `bun run build` / `bun run lint` / `bun run format` (prettier).
- No test suite, no CI, no `typecheck` script. Type-check with `bunx tsc --noEmit`.

## Architecture

- `src/routes/` is file-based routing (TanStack). `src/routes/routeTree.gen.ts` is generated — never edit. See `src/routes/README.md` for the naming table.
- `src/start.ts` re-adds CSRF + error middleware. Deleting this file silently drops CSRF protection on server functions.
- `src/server.ts` is the SSR entry wrapper that normalizes h3-swallowed 500s.
- Server functions use `createServerFn` in `src/lib/*.functions.ts`. Server-only modules use the `.server.ts` suffix and must be **dynamically imported** inside handlers (route files and `*.functions.ts` ship to the client bundle; top-level `.server.ts` imports there break).
- Money is always integer cents, priced in exactly one place: `src/lib/pricing.server.ts`. Never compute prices client-side.
- `src/lib/order-status.ts` is the single order/payment state machine (allowed transitions enforced server-side). Don't duplicate status lists.
- All checkout methods (WhatsApp, bank transfer, card) funnel through `src/lib/order-create.server.ts`.

## Supabase / Database

- `src/integrations/supabase/*` files are auto-generated — do not edit. `client.server.ts` is the service-role client (bypasses RLS; server only).
- Drizzle is **not** used for schema: `drizzle/schema.ts` is intentionally blank. Real schema lives in `deploy/supabase/*.sql`. Fresh projects load `01-schema` → `02-data` → `03-storage` → `04-admin-user`; existing projects apply `05-cake-pricing` before rerunning the idempotent `02-data` seed.
- Admin roles are resolved server-side via `is_admin` / `is_staff` RPCs — never trust the browser.
- The Stripe webhook (`/api/public/stripe-webhook`) marks orders paid, not the customer's return trip to the site.

## Environment & gotchas

- Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Secret: `SUPABASE_SERVICE_ROLE_KEY` (never ship to client).
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` and `GOOGLE_MAPS_API_KEY` are optional — omitting them hides card payments / distance-based delivery respectively.
- `bunfig.toml` enforces a 24h supply-chain age guard on new dependencies; add exceptions there only after confirming with the user.
- Do not add TanStack/tailwind/tsconfig plugins to `vite.config.ts` — they are already bundled by `@lovable.dev/vite-tanstack-config` and duplicates break the app.
