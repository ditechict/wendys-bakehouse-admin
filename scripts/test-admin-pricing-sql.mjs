import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const modulePath = process.env.WENDY_PGLITE_MODULE;
if (!modulePath)
  throw new Error("Set WENDY_PGLITE_MODULE to the installed @electric-sql/pglite/dist/index.js");
const { PGlite } = await import(pathToFileURL(modulePath));
const db = new PGlite();
const actor = "11111111-1111-4111-8111-111111111111";
const cake = "44ded383-6c8e-4cbd-a8a4-e42da64c0c8b";
const category = "382b2742-6d74-4a4c-9a1f-dabaf5755a2d";
const group = "22222222-2222-4222-8222-222222222222";
const choice = "33333333-3333-4333-8333-333333333333";
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key);
    CREATE TABLE public.user_roles(user_id uuid, role text);
    CREATE TYPE public.payment_rule AS ENUM ('full','deposit');
    CREATE TYPE public.pricing_mode AS ENUM ('fixed','deposit','quote');
    CREATE TABLE public.products(id uuid primary key, category_id uuid, price_cents integer,
      payment_rule public.payment_rule, pricing_mode public.pricing_mode, deposit_percent integer,
      deposit_cents integer, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.product_option_groups(id uuid primary key, product_id uuid REFERENCES public.products);
    CREATE TABLE public.product_option_choices(id uuid primary key, group_id uuid REFERENCES public.product_option_groups,
      price_delta_cents integer, updated_at timestamptz NOT NULL DEFAULT now());`);
  const migration = await readFile("deploy/supabase/08-admin-pricing-reconciliation.sql", "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.query("INSERT INTO auth.users VALUES ($1)", [actor]);
  await db.query("INSERT INTO public.user_roles VALUES ($1,'admin')", [actor]);
  await db.query(
    `INSERT INTO public.products(id,category_id,price_cents,payment_rule,pricing_mode,deposit_percent,buttercream_minimum_cents,fondant_minimum_cents)
    VALUES ($1,$2,7000,'deposit','deposit',70,13000,28000)`,
    [cake, category],
  );
  await db.query("INSERT INTO public.product_option_groups VALUES ($1,$2)", [group, cake]);
  await db.query(
    "INSERT INTO public.product_option_choices(id,group_id,price_delta_cents) VALUES($1,$2,6000)",
    [choice, group],
  );
  const snapshot = async () => {
    const p = (await db.query("SELECT to_jsonb(p) AS p FROM public.products p WHERE id=$1", [cake]))
      .rows[0].p;
    const c = (
      await db.query("SELECT to_jsonb(c) AS c FROM public.product_option_choices c ORDER BY id")
    ).rows.map((r) => r.c);
    return {
      id: cake,
      updated_at: p.updated_at,
      price_cents: 8000,
      payment_rule: "deposit",
      deposit_percent: 65,
      buttercream_minimum_cents: 14000,
      fondant_minimum_cents: 29000,
      expected_choices: c,
      choices: c.map((v) => ({ id: v.id, price_delta_cents: 6500 })),
    };
  };
  const save = (payload, who = actor) =>
    db.query("SELECT public.admin_save_pricing_v2($1,$2::jsonb)", [who, JSON.stringify(payload)]);
  let payload = await snapshot();
  await assert.rejects(save(payload, "99999999-9999-4999-8999-999999999999"), /Forbidden/);
  await assert.rejects(save({ ...payload, updated_at: "2000-01-01T00:00:00Z" }), /Reload/);
  await assert.rejects(save({ ...payload, payment_rule: "full" }), /protected/);
  await assert.rejects(
    save({ ...payload, choices: [...payload.choices, ...payload.choices] }),
    /Invalid choices/,
  );
  await db.query("UPDATE public.product_option_choices SET price_delta_cents=6100 WHERE id=$1", [
    choice,
  ]);
  await assert.rejects(save(payload), /Choices changed/);
  assert.equal(
    (await db.query("SELECT price_cents FROM public.products")).rows[0].price_cents,
    7000,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM public.pricing_change_audit")).rows[0].n,
    0,
  );
  payload = await snapshot();
  await save(payload);
  const result = (
    await db.query(
      "SELECT price_cents, deposit_percent, buttercream_minimum_cents FROM public.products",
    )
  ).rows[0];
  assert.deepEqual(result, {
    price_cents: 8000,
    deposit_percent: 65,
    buttercream_minimum_cents: 14000,
  });
  assert.equal(
    (await db.query("SELECT price_delta_cents FROM public.product_option_choices")).rows[0]
      .price_delta_cents,
    6500,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM public.pricing_change_audit")).rows[0].n,
    1,
  );
  await assert.rejects(save(payload), /Reload/);
  const design = "44444444-4444-4444-8444-444444444444";
  await db.query(
    "INSERT INTO public.products(id,category_id,payment_rule,pricing_mode) VALUES($1,$2,'full','fixed')",
    [design, category],
  );
  const dp = (
    await db.query("SELECT to_jsonb(p) AS p FROM public.products p WHERE id=$1", [design])
  ).rows[0].p;
  await assert.rejects(save({ ...payload, id: design, updated_at: dp.updated_at }), /inherit/);
  for (const role of ["anon", "authenticated"])
    assert.equal(
      (
        await db.query(
          "SELECT has_function_privilege($1,'public.admin_save_pricing_v2(uuid,jsonb)','execute') AS ok",
          [role],
        )
      ).rows[0].ok,
      false,
    );
  console.log(
    "PASS additive migration rerun, authorization, stale snapshots, protected cake rules, exact choices, atomic save/audit, design inheritance and browser-role denial",
  );
} finally {
  await db.close();
}
