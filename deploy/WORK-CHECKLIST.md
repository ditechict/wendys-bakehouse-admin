# Wendy’s Bakehouse — authoritative work checklist

Updated: 18 October 2026, release in progress after the owner paused further uploads and explicitly instructed shipping and visibility for all uploaded products (18:07 Lagos).

Batches 1–2: twenty original photographs saved as twenty available products (sort 201–220); database total 40 products. Batch 2 contains six Custom cakes and four Cupcakes. All twenty uploaded images render in the authenticated admin list. Names, descriptions, categories and draft prices/pack sizes verified against the prepared mapping. Original backgrounds retained; zero crop and no regeneration used.

Batch 2 cupcake draft recommendations: Pink Doll Party CAD72 per12; Pink Rosette, Blush & Ivory, Champagne & Ivory CAD60 per12. These are provisional product-entry recommendations, not cost-validated bakery prices. Owner approved required procedures and then explicitly requested storefront visibility. All twenty exact product IDs were enabled; cupcake prices remain CAD60/CAD72 per12 and their customer-facing notes now describe the pack and confirmation of flavours/toppers. Exact celebration-cake prices, flavours, dimensions and servings are not inferred. Celebration designs inherit canonical pricing; CAD130 buttercream / CAD280 fondant minimums are not exact quotes for the photographs. Heart/doll construction, modelled elephant decorations and topper extras require business confirmation before activation. No pricing-engine rule was changed to accommodate them.

Owner approval at approximately 18:03 Lagos: "All required approvals have been approved, complete all necessary procedures/processes." Apply this to the current authorised work without repeated routine approval requests. It does not establish missing product facts, verify mobile QA or establish that all photo batches have been supplied. Preserve milestone order; production publication has not occurred.

Menu/listing price removal and embedded admin pricing editor are implemented in source, TypeScript and Sites build pass. These changes remain unpublished and their deployed browser verification remains pending. Product metadata saves separately from the embedded audited pricing editor; design pricing edits affect the shared canonical cake and explicitly warn the administrator.

## Resume procedure

1. Read this file before acting, proposing a next milestone, merging or publishing. Reconcile it with the latest user instructions and actual repository/deployment state.
2. Preserve the agreed order. Do not silently reorder, omit or replace tasks. If prior context is missing, recover it before making a claim; keep uncertainty explicit.
3. Record each task’s scope, approval and evidence. A passed custom-cake test does not verify other product categories; source/build checks do not establish browser behavior.
4. Update this checklist after meaningful changes and before pausing for authentication, approval or handoff. Record the next pending action and any blocker.
5. Before proposing publication, inspect every pending prerequisite. Do not infer release readiness from the most recent successful test. User authorization persists within its actual scope; ask only for necessary live-record changes or materially changed scope.
6. Never claim ChatGPT system memory was updated without a successful supported memory-write operation. This file and the AGENTS.md pointer are durable project instructions, not global system memory.

## Agreed milestone order

The original accepted sequence on 17 October was **admin alignment → product images in batches → production publication**. The 18 October migration/test/publish reconstruction incorrectly moved the image pilot after publication. It does not supersede the original sequence.

| Order | Task | Status | Evidence / remaining work |
| --- | --- | --- | --- |
| 1a | Preserve homepage and brand requests | Implemented; browser review incomplete | Homepage prices removed; Browse cakes / Customize your cake; Featured cakes; automatic booking month retained; footer logo treatment; distinct custom-cake art; catalogue retry/contact fallback; Chat labels; Home/Menu/Pricing/Our story. Builds passed. See release and brand notes. |
| 1b | Align cake designs and authoritative pricing | Implemented and partly verified | All designs use the canonical configurator; new custom-cake design form hides independent pricing. Pricing-engine and catalogue fixtures pass. $70 is the canonical base; $130 buttercream / $280 fondant are minimum totals, not interchangeable base prices. Browser verification across actual configurations remains open. |
| 1c | Apply additive pricing migration | Complete; owner approved | Migration 08 applied to project rrgusprzsfdmlzsnjixz. RPC execute denied to anon/authenticated, allowed to service_role; audit RLS enabled. No seed/reset/optional migration 09 executed. |
| 1d | Authenticated disposable crop/upload/save test and cleanup | Complete; owner approved | Created unavailable design through preview admin. 600×600 fixture trimmed 20% top/bottom; reopened persisted 600×360 JPEG. Null independent price; shared pricing message. Anonymous read excluded it. Deleted test product and image through app; verified zero remaining records/objects. |
| 1e | Pastries, Drinks and Cake loaves alignment | DEFERRED by owner at 17:00 | Owner said to ignore these for now; no storefront implementation is needed yet. Retain all records and current exclusion. Read-only audit before deferral found their nine direct product pages unavailable, admin records retained, and isolated pricing-engine tests rejecting all nine even with available/visible fixture flags. No live records changed. |
| 1f | Header/mobile navigation and interactions | Desktop checked; source fix unpublished; mobile BLOCKED | Desktop navigation destinations, hero actions, logo/footer blending and empty-basket cleanup verified. Menu link lacked aria-current on the settled /menu page. Corrected both navigation maps to match exact paths independently of category search using includeSearch:false; TypeScript and Sites build passed. Deployed verification of this correction is still pending. Mobile browser QA remains unverified: managed preview cannot start (bwrap cannot mount /newroot/proc: Operation not permitted); status confirms preview stopped. Do not bypass managed infrastructure or count desktop as mobile verification. |
| 1g | Admin settings, uploaded-image precedence and gallery | Partly verified | Implementation exists; saved disposable image reopened correctly. Complete public/admin consistency review; contact-setting writes and other live edits need appropriate approval. |
| 2 | Product-image pilot, then batches | First twenty complete; further uploads PAUSED by owner | Owner reviewed Red Racing sample and instructed Continue. Batches 1 and 2 saved as twenty unavailable drafts; six celebration cakes and four cupcake sets added in batch 2. Database verifies exact copy, price values, pack sizes, categories and image references; all twenty new images load in admin. Shared cake pricing retained; cupcake values are provisional. Ask for next ten. |
| 3 | Production release to Vercel and selected private Site | AUTHORISED; in progress | Owner explicitly instructed shipping on 18 October at18:07 Lagos, superseding the publishing hold. Reconcile five later application edits into PR2, run checks, merge exact tested head and verify Vercel deployment. Update the explicitly selected owner-private review Site with its review-only wrapper/access retained; do not broaden audience or repurpose another Site. |

## Preservation and verification evidence

- Private review project: appgprj_6ad22cdd08548191861c8d85c5c3fe61. Owner-only audience. Private wrapper intentionally blocks admin/auth/checkout/write requests.
- Production source repository: sleekfash/admin-wendy. Draft PR: https://github.com/sleekfash/admin-wendy/pull/2. Do not modify the separate fashion repository.
- Verified admin preview: https://admin-wendy-git-reconcile-admin-storefr-025b4c-sleekgith-vercel.vercel.app.
- Canonical cake: 44ded383-6c8e-4cbd-a8a4-e42da64c0c8b. Custom cakes collection: 382b2742-6d74-4a4c-9a1f-dabaf5755a2d. Preserve IDs, shared options, prices and referenced photographs.
- After migration and disposable test cleanup: 20 products; full products hash 9771a5763f0c3392b8727688bd7dda57; choices hash 9c29a9cd579acab1df5dd0e7f5b2ecaa; categories hash ca576a7f25a40a5a0852fd7272306cfd. All match the pre-migration baseline. Audit rows: 0.
- Completed automated checks: TypeScript, Sites/Vercel builds, 13 actual-engine pricing regressions, catalogue inheritance fixtures, isolated PostgreSQL RPC validation, browser crop fixture and authenticated crop/upload/save/cleanup.
- Read-only category audit on 18 October: Cake loaf CAD28, Cocktail drinks CAD25, Meat/Chicken pie packs CAD28 per12, Scotch eggs CAD26 per6, Sausage rolls CAD25 per12, Samosa/Spring rolls CAD25 per20, Small chops CAD28 (no structured pack size). All nine lack uploaded image_url; preserve existing image_key and records. Owner subsequently deferred these categories; do not treat image/pack-field gaps as current storefront work.
- Desktop pricing and basket browser checks: 6-inch two-layer buttercream CAD130 / CAD91 due / CAD39 balance; 6-inch three-layer plus one-tier fondant CAD280 / CAD196 due / CAD84 balance. Basket retained selections and server totals. Test basket cleared; no order, payment, reset email or database write was submitted.
- Desktop homepage screenshot confirmed static three-cake hero, differentiated Browse/Customize actions and readable header; footer screenshot confirmed white transparent logo on cocoa. Menu lists eleven cake entries with CAD130 starting prices. No mobile claim is made.
- Historical orders are not a preservation priority, but this is not authorization for unrelated deletion. The user cancelled the catalogue wipe; retain necessary production/pricing/image dependencies.

## Uncertainties and limits

- This is a reconciliation of recovered conversation and repository evidence; do not describe all admin/category checks as completed.
- Both new batch mappings are recorded in deploy/catalogue-batches/batch-01-product-details.json/.md and batch-02-product-details.json/.md. The ten older designs remain distinct records and were not overwritten. Full perceptual duplicate review of future batches remains necessary.
- Password-recovery UI exists; email delivery and redirect configuration remain unverified. No reset email or financial transaction was sent during these tests.
- Security advisors flagged the pre-existing rls_auto_enable function grants and disabled leaked-password protection. Performance advisors flagged audit-table foreign-key indexes and existing policy/index findings. No unrelated security configuration was changed.
- Older release notes describe the state at their creation and include stale verification/publishing order. This checklist governs current work; preserve historical notes with a pointer rather than treating them as current readiness evidence.

## Next pending action

Finish authorised shipping: publish the reconciled Vercel build and update the selected private Sites review while preserving its audience. Verify all twenty newly enabled uploads in the deployed storefront, no listing-card prices, correct product-page pricing and admin metadata/embedded pricing editor. Further image batches are paused. Mobile/browser infrastructure limits must be reported accurately. Do not submit orders or payments as part of release smoke checks.
