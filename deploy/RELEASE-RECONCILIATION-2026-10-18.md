# Wendy's Bakehouse reconciliation release — 18 October 2026

## Release behavior

- Preserve approved hero, booking month, logo, Home/Menu/Pricing navigation, Chat labels and removal of the homepage price section.
- All noncanonical products in the protected Custom cakes collection are design references. New designs inherit the main cake's current minimums, deposit and options without a code registry. Ordering routes through the canonical configurator.
- Admin uploads override default photographs. The main cake gallery uses visible catalogue designs. Top/bottom trimming previews a new file, preserving the original. Cropped uploads remain JPG, PNG or WebP (5 MB maximum); trimmed output is JPEG.
- Metadata edits do not overwrite existing prices. Admin Pricing saves through the new, service-role-only `admin_save_pricing_v2` function; product/choice snapshots are checked, changes are atomic and an audit entry is written.
- Protect the canonical product slug/collection and preserve image objects referenced by products or collections.
- Catalogue reads and server pricing exclude hidden/non-cake collections. Contact buttons read only the admin WhatsApp number through a separate public contact function; catalogue outages retain the contact fallback.

## Before production (owner approval required)

1. Review and apply `deploy/supabase/08-admin-pricing-reconciliation.sql` to the verified Wendy Supabase project. It adds missing minimum columns if necessary, an audit table and a new versioned RPC. It does not seed or change existing product prices, imagery, categories or orders, and leaves the previous RPC intact. Back up schema/function definitions first.
2. Verify existing minimum values and the protected product/group IDs; do not replace them with defaults. Ensure browser roles cannot execute the pricing RPC. Confirm Vercel has public Supabase configuration and its existing server-only service key; keys must not be copied into source.
3. Use an isolated staging database, or separately approve a disposable unavailable design and image, to verify authenticated crop/upload/save and shared configurator behavior. No production write test has been performed in this milestone. Password-reset delivery requires the correct `/auth?recovery=1` redirect allowlist and functioning email delivery; neither has been changed.
4. Only after checks pass, merge/release the prepared production branch. Vercel builds target its native preset and retain sign-in/checkout. The private review package intentionally keeps sign-in/checkout disabled.
5. The production Sites project must be positively identified before publishing there. Do not deploy the private review archive to a public production Site.

`09-cake-only-storefront.sql` is an older optional live-data cleanup. It is NOT part of migration 08 and must not be run automatically. The release's read and pricing filters already exclude non-cake collections. No deletion is proposed, even though historical orders are no longer a preservation requirement.

## Validation

- TypeScript and both Sites/Vercel production builds pass.
- 13 pricing regressions exercise the actual server pricing engine, including attainable minimum, deposit, hidden collection and dynamic-design bypass rejection.
- Catalogue fixture tests cover new-design inheritance and fail-closed behavior when the main pricing product is unavailable.
- Isolated PostgreSQL tests (PGlite) execute migration 08 twice and exercise actor/role checks, stale data, protected deposit/minimums, choice identity, atomic price/choice/audit saves and design inheritance. This is not proof the live migration is installed.
- Browser crop test passes original preservation, top/bottom removal, exact output dimensions and invalid crop rejection.
- Full catalogue browser inspection in this session is blocked by local SSR/browser timeouts. Authenticated live saves, reset-email delivery and payments remain unverified.

## Preservation and rollback

The canonical product UUID is `44ded383-6c8e-4cbd-a8a4-e42da64c0c8b`; the Custom cakes collection UUID is `382b2742-6d74-4a4c-9a1f-dabaf5755a2d`. The existing ten photographed designs and brand PNG are retained byte-for-byte. All seeds, import endpoints and live destructive cleanup are excluded from release execution.

If application checks fail, roll back to the previous deployment. Migration 08 is additive and can remain unused; do not drop audit data or minimum columns as an automatic rollback. The old application continues to use its old pricing function/path.
