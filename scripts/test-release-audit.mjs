import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temp = await mkdtemp(join(tmpdir(), "bakery-release-audit-"));
try {
  for (const name of ["collection-photo", "admin-pricing-snapshot"]) {
    await build({ entryPoints: [`src/lib/${name}.ts`], outfile: join(temp, `${name}.mjs`),
      bundle: true, platform: "node", format: "esm" });
  }
  const { collectionPhoto } = await import(pathToFileURL(join(temp, "collection-photo.mjs")));
  const category = { id: "cupcakes", image_key: "cupcakes", image_url: null };
  const product = { category_id: "cupcakes", available: true, image_url: "storage:products/box.jpg" };
  assert.equal(collectionPhoto(category, [product]), "/api/public/product-image/products/box.jpg",
    "the shipped legacy-key regression must use an uploaded product photo");
  assert.equal(collectionPhoto({ ...category, image_url: "https://example.com/collection.jpg" }, [product]),
    "https://example.com/collection.jpg", "explicit admin image takes precedence");
  assert.equal(collectionPhoto({ ...category, image_url: "/assets/old-generated.jpg" }, [product]),
    "/api/public/product-image/products/box.jpg");
  assert.equal(collectionPhoto(category, [
    { ...product, image_url: null }, { ...product, available: false },
    { ...product, category_id: "other" }, product,
  ]), "/api/public/product-image/products/box.jpg", "skip missing, hidden and other-collection photos");
  assert.equal(collectionPhoto(category, []), "", "empty collections retain the honest placeholder");
  console.log("PASS collection image: legacy key, admin override, rejected legacy URL, eligible fallback, empty state");

  const { capturePricingSnapshot, pricingSnapshotChanged } = await import(
    pathToFileURL(join(temp, "admin-pricing-snapshot.mjs")));
  const data = { products: [{ id: "cake", updated_at: "version-1", price_cents: 7000 }],
    groups: [{ id: "size", product_id: "cake" }],
    choices: [{ id: "six-inch", group_id: "size", price_delta_cents: 6000 }] };
  const snapshot = capturePricingSnapshot(data, "cake");
  assert.equal(pricingSnapshotChanged(snapshot, data), false);
  data.products[0].updated_at = "version-2";
  data.choices[0].price_delta_cents = 8000;
  assert.equal(snapshot.product.updated_at, "version-1", "keep original optimistic-lock version");
  assert.equal(snapshot.choices[0].price_delta_cents, 6000, "keep reviewed expected choices");
  assert.equal(pricingSnapshotChanged(snapshot, data), true, "background cache refresh flags stale edit");
  assert.equal(pricingSnapshotChanged(capturePricingSnapshot(data, "cake"), data), false,
    "explicit reload captures the new revision");
  data.choices.push({ id: "eight-inch", group_id: "size", price_delta_cents: 9000 });
  assert.equal(pricingSnapshotChanged(snapshot, data), true);
  assert.equal(capturePricingSnapshot(data, "missing"), null);
  console.log("PASS pricing edit snapshot: immutable original revision/choices, stale detection, explicit reload, missing product");
} finally {
  await rm(temp, { recursive: true, force: true });
}
