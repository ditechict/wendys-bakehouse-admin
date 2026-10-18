# Release audit and corrective implementation — 18 October 2026

Scope: the shipment merged as57baa5e2832ec54f24bec0ddd983f524433a3015 in sleekfash/admin-wendy, and private Sites deployment appgdep_6ad4fe5b395c8191ba013713dd73047a. Owner subsequently prioritised Vercel and deferred Sites deployment. Further uploads remain paused.

## Findings and corrections to earlier claims

| Severity | Finding | Evidence | Corrective action |
| --- | --- | --- | --- |
| High | Homepage Cupcakes collection has no image on both hosts. Earlier product-menu checks did not cover this card. | Vercel browser DOM: card contains “Photograph coming soon” and zero img elements. Authenticated Sites HTML gives the same result. Category has image_key=cupcakes and image_url=null; four uploaded product photos exist. | Fix image fallback after rejecting a legacy key; preserve explicit collection-image precedence and skip products without eligible photos. Admin Collections previews the same selection. |
| High, Sites pending | All twenty new uploaded image endpoints fail on Sites. A successful deployment did not prove image delivery. | Private read-only HTTP check:31 cards, all20 slugs, zero card prices;11 bundled image URLs pass and20 uploaded URLs fail. Worker log request da4e2cb9b6c52cb36cb226573be39a50 records image HTTP500 and missing SUPABASE_SERVICE_ROLE_KEY. Runtime configuration lists only public URL/key. | Do not mark Sites fixed. When the owner resumes Sites deployment, configure an appropriate server-side image delivery credential securely, deploy prepared code and verify all uploaded image responses. Do not expose a secret or make the storage bucket public as a workaround. |
| Medium | Admin pricing editor could substitute refreshed cache timestamps/expected choices while retaining older input values, weakening conflict detection. | Code used query.data directly for the save version and expected choices. SQL protection exists, but its input must represent the version actually reviewed. | Capture an immutable selection snapshot, detect stale data, disable review/save until explicit reload; preserve server-side atomic/version checks. |
| Medium | Continuity checklist contained stale statements (“publication has not occurred”, unavailable drafts, request next batch) after shipping. | deploy/WORK-CHECKLIST.md contradicted its own shipped section. | Correct current state, preserve dated evidence as historical and maintain this claim matrix. |
| Scope limit | “Admin improvements included” was supported by preview editor reads and builds, not a complete production admin save regression. | Prior preview loaded embedded pricing; earlier disposable upload save passed before the latest editor integration. | Distinguish read/review checks, isolated server tests and live mutation tests. Do not claim an unperformed live price change or financial transaction. |

## Claim matrix for the prior shipment

| Prior statement | Assessment |
| --- | --- |
| Vercel and Sites deployed successfully | Confirmed deployment outcomes; not proof of every feature. Vercel merge57baa5e has successful provider status; Sites native deployment succeeded. |
| All20 uploads visible | Product records/text are listed on both hosts. Vercel product-menu images were browser-verified; the homepage collection image was missed. Sites uploaded image delivery failed and was not verified by the previous claim. |
| Prices only on product pages, not menu cards | Zero monetary strings in31 menu cards; cupcake detail CAD72 and cake design From CAD130, including the design-reference disclaimer and canonical configurator link. This does not mean CAD130 recreates the pictured design. |
| Admin edits available | Product metadata and embedded pricing editor exist and loaded in preview. Original-image uploads were saved through authenticated admin. No claim of complete live pricing-save or recovery/payment verification is justified. |
| Original photos retained | Originals were selected without crop/regeneration; photos rendered in admin. Full uploaded-byte integrity was not verified in the prior release; local direct download checks had failed. |
| Enterprise-level readiness | Not established by a build or a screenshot. Mobile viewport, reset-email delivery, real payment/webhook flows and full operational/security review remain explicit acceptance items. |

## Implementation and non-regression plan

1. Preserve current data and deployment configuration. Record product/category/option hashes; no catalogue, pricing, role, storage-policy or schema writes are part of this correction.
2. Fix collection-photo selection and use it in admin collection previews. Test legacy-key failure, explicit image precedence, invalid image fallback, unavailable/other-category exclusions and empty collections.
3. Freeze admin edit versions and choice snapshots. Test refresh/conflict detection and explicit reload; rerun isolated PostgreSQL authorization, atomic-save and stale-version tests.
4. Run TypeScript, native Vercel build,13 pricing regressions, catalogue inheritance/filter fixtures and new focused tests. Do not transfer the private Sites wrapper into Vercel.
5. Deploy a preview, verify the actual homepage Cupcakes image, all31 catalogue entries, uploaded photos, no menu-card prices, details/configurator handoff and authenticated admin collection/product editor reads. Only then merge the exact tested commit and verify production.
6. Keep Sites deployment pending. Its runtime credential/image-delivery defect remains an explicit blocker even though the collection fallback source is prepared.

## Preservation baseline (before correction)

- Products40; products hash8a525a32e948645a7b95ca0321b952f6.
- Categories hashca576a7f25a40a5a0852fd7272306cfd.
- Option choices hash9c29a9cd579acab1df5dd0e7f5b2ecaa.
- Sixteen newly uploaded celebration-cake designs and four cupcake sets are enabled. Cupcake prices are CAD60 or CAD72 per12; these were generated recommendations approved for visibility, not a validated costing exercise.

## Rollback

The previous production application is commit57baa5e2832ec54f24bec0ddd983f524433a3015. If the correction fails production checks, revert the corrective application commit through a normal new commit/PR or restore the prior Vercel deployment. Do not rewrite published history or alter retained database/image records. No reverse migration is needed.

## Verification status

Prepared correction passes TypeScript, native Vercel build, focused image/snapshot tests, catalogue fixtures,13 pricing regressions and isolated PostgreSQL admin authorization/atomic-save tests. Deployment and final browser/HTTP evidence will be appended after verification. Sites publication is deferred by the owner.
