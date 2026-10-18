import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const temp = await mkdtemp(join(tmpdir(), "wendy-catalog-"));
const oldUrl = process.env.SUPABASE_URL,
  oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
try {
  await build({
    entryPoints: ["src/lib/catalog.functions.ts"],
    outfile: join(temp, "catalog.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "isolated-catalog",
        setup(b) {
          b.onResolve({ filter: /^@tanstack\/react-start$/ }, () => ({
            path: "start",
            namespace: "mock",
          }));
          b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({
            path: "supabase",
            namespace: "mock",
          }));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            contents:
              a.path === "start"
                ? "export function createServerFn(){const fn={inputValidator(){return fn},handler(h){return (...args)=>h(args[0]||{})}};return fn}"
                : "export function createClient(){return globalThis.__CATALOG_TEST_DB}",
            loader: "js",
          }));
        },
      },
    ],
  });
  const data = JSON.parse(
    await readFile("scripts/fixtures/public-catalog-2026-10-14.json", "utf8"),
  );
  globalThis.__CATALOG_TEST_DB = {
    from(table) {
      let rows = data[table] || [];
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          rows = rows.filter((r) => r[k] === v);
          return q;
        },
        order() {
          return q;
        },
        then(resolve) {
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_PUBLISHABLE_KEY = "fixture";
  const { getCatalog } = await import(pathToFileURL(join(temp, "catalog.mjs")));
  const cake = data.products.find((p) => p.slug === "tiered-celebration-cake");
  const design = {
    ...cake,
    id: "eeeeeeee-1111-4111-8111-111111111111",
    slug: "fresh-admin-design",
    price_cents: null,
    deposit_percent: null,
    payment_rule: "full",
  };
  data.products.push(design);
  let catalog = await getCatalog();
  const listed = catalog.products.find((p) => p.id === design.id);
  assert.ok(listed, "new design is listed without a code registry");
  assert.equal(listed.price_cents, cake.price_cents);
  assert.equal(listed.deposit_percent, cake.deposit_percent);
  assert.equal(listed.starting_price_cents, 13000);
  assert.ok(catalog.products.every((p) => catalog.categories.some((c) => c.id === p.category_id)));
  const cat = data.categories.find((c) => c.id === cake.category_id);
  cat.visible = false;
  catalog = await getCatalog();
  assert.equal(
    catalog.products.some((p) => p.id === design.id),
    false,
  );
  cat.visible = true;
  cake.available = false;
  catalog = await getCatalog();
  assert.equal(
    catalog.products.some((p) => p.id === design.id),
    false,
    "design disappears if its pricing product is unavailable",
  );
  console.log(
    "PASS dynamic design inheritance, minimum price, visible collection filtering and missing pricing-product fallback",
  );
} finally {
  delete globalThis.__CATALOG_TEST_DB;
  if (oldUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = oldUrl;
  if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
  await rm(temp, { recursive: true, force: true });
}
