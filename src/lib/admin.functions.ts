import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppDatabase } from "@/lib/database.types";
import { z } from "zod";
import { isCakeDesignProduct } from "./cake-designs";

type Ctx = { supabase: unknown; userId: string };

type Rpc = { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> };

/** Roles are resolved server-side on every call, never trusted from the browser. */
async function roleOf(context: Ctx): Promise<"admin" | "staff" | null> {
  const supabase = context.supabase as Rpc;
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin === true) return "admin";
  const { data: staff } = await supabase.rpc("is_staff");
  if (staff === true) return "staff";
  return null;
}

async function assertStaff(context: Ctx) {
  const role = await roleOf(context);
  if (!role) throw new Error("Forbidden");
  return role;
}

async function assertAdmin(context: Ctx) {
  const role = await roleOf(context);
  if (role !== "admin") throw new Error("Forbidden");
  return role;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<AppDatabase>;
}

async function deleteUnreferencedProductImage(
  db: SupabaseClient<AppDatabase>,
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl?.startsWith("storage:products/")) return;
  const { count, error } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("image_url", imageUrl);
  if (error || count !== 0) return;
  const categoryReferences = await db
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("image_url", imageUrl);
  if (categoryReferences.error || categoryReferences.count !== 0) return;
  await db.storage.from("product-images").remove([imageUrl.slice("storage:".length)]);
}

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  nextOrderStatuses,
  nextPaymentStatuses,
} from "@/lib/order-status";
import {
  CUSTOM_CAKE_PRODUCT_SLUG,
  customCakeRuleGroup,
  isCustomCakeCategory,
  isCustomCakeOptionGroup,
  isCustomCakeProduct,
  isCustomCakeRuleGroup,
} from "@/lib/custom-cake-contract";

export { ORDER_STATUSES, PAYMENT_STATUSES, nextOrderStatuses, nextPaymentStatuses };

/** Who am I, as far as the server is concerned. */
export const adminWhoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ role: await assertStaff(context) }));

/** Orders list with their items, newest first. */
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data, error } = await db
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Operational counters for the dashboard, derived from real rows. */
export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();

    const today = new Date().toISOString().slice(0, 10);
    const [ordersRes, itemsRes] = await Promise.all([
      db
        .from("orders")
        .select(
          "id, reference, customer_name, created_at, pickup_date, fulfilment, status, payment_status, due_now_cents",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("order_items").select("name, quantity").limit(2000),
    ]);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const orders = ordersRes.data ?? [];
    const live = orders.filter((o) => o.status !== "cancelled");

    const counts = {
      today: orders.filter((o) => o.created_at.slice(0, 10) === today).length,
      pendingVerification: live.filter((o) => o.payment_status === "pending_verification").length,
      needsAttention: live.filter((o) => o.status === "new").length,
      baking: live.filter((o) => o.status === "baking").length,
      ready: live.filter((o) => o.status === "ready").length,
      upcomingPickup: live.filter(
        (o) => o.fulfilment === "pickup" && (o.pickup_date ?? "") >= today,
      ).length,
      upcomingDelivery: live.filter(
        (o) => o.fulfilment === "delivery" && (o.pickup_date ?? "") >= today,
      ).length,
    };

    const dueCents = live
      .filter((o) => o.payment_status !== "paid" && o.payment_status !== "refunded")
      .reduce((sum, o) => sum + (o.due_now_cents ?? 0), 0);

    const collectedCents = live
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + (o.due_now_cents ?? 0), 0);

    const tally = new Map<string, number>();
    for (const row of itemsRes.data ?? []) {
      tally.set(row.name, (tally.get(row.name) ?? 0) + row.quantity);
    }
    const bestSellers = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    return {
      counts,
      dueCents,
      collectedCents,
      totalOrders: orders.length,
      bestSellers,
      recent: orders.slice(0, 6),
      upcoming: live
        .filter((o) => (o.pickup_date ?? "") >= today)
        .sort((a, b) => (a.pickup_date ?? "").localeCompare(b.pickup_date ?? ""))
        .slice(0, 8),
    };
  });

/** Short-lived signed URL for a payment slip. */
export const adminSlipUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: signed, error } = await db.storage
      .from("payment-slips")
      .createSignedUrl(data.path, 60 * 30);
    if (error || !signed) throw new Error("Could not open that slip.");
    return { url: signed.signedUrl };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(ORDER_STATUSES).optional(),
        payment_status: z.enum(PAYMENT_STATUSES).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();

    const { data: current, error: readError } = await db
      .from("orders")
      .select("status, payment_status, payment_provider, stripe_session_id")
      .eq("id", data.id)
      .single();
    if (readError || !current) throw new Error("That order no longer exists.");

    const patch: { status?: string; payment_status?: string } = {};
    const stripeManaged =
      current.payment_provider === "stripe" || current.stripe_session_id != null;
    if (data.status && data.status !== current.status) {
      if (stripeManaged && current.payment_status === "pending") {
        throw new Error(
          "Wait for Stripe to finish or expire this payment before changing the order.",
        );
      }
      if (!nextOrderStatuses(current.status).includes(data.status)) {
        throw new Error(`An order cannot go from ${current.status} to ${data.status}.`);
      }
      patch.status = data.status;
    }
    if (data.payment_status && data.payment_status !== current.payment_status) {
      if (stripeManaged) {
        throw new Error("Stripe payment status is updated automatically by its webhook.");
      }
      if (!nextPaymentStatuses(current.payment_status).includes(data.payment_status)) {
        throw new Error(
          `Payment cannot go from ${current.payment_status} to ${data.payment_status}.`,
        );
      }
      patch.payment_status = data.payment_status;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { data: updated, error } = await db
      .from("orders")
      .update(patch)
      .eq("id", data.id)
      .eq("status", current.status)
      .eq("payment_status", current.payment_status)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("That order changed. Refresh it before trying again.");
    return { ok: true };
  });

/** Full product list, including unavailable and archived items. */
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();
    const [prods, cats] = await Promise.all([
      db.from("products").select("*").order("sort_order"),
      db.from("categories").select("*").order("sort_order"),
    ]);
    if (prods.error) throw new Error(prods.error.message);
    if (cats.error) throw new Error(cats.error.message);
    return { products: prods.data ?? [], categories: cats.data ?? [] };
  });

/**
 * Payment rule is an explicit choice, never guessed from empty prices.
 * `pricing_mode` is derived from it so old readers stay correct.
 */
const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
    name: z.string().trim().min(2).max(120),
    category_id: z.string().uuid().nullable(),
    short: z.string().trim().max(240).default(""),
    description: z.string().trim().max(4000).default(""),
    payment_rule: z.enum(["full", "deposit"]),
    price_cents: z.number().int().min(0).max(10_000_00).nullable(),
    deposit_cents: z.number().int().min(0).max(10_000_00).nullable(),
    deposit_percent: z.number().int().min(1).max(100).nullable(),
    pack_size: z.number().int().min(1).max(1000).nullable(),
    pack_unit: z.string().trim().max(40).nullable(),
    price_note: z.string().trim().max(200).nullable(),
    lead_time: z.string().trim().max(80).default(""),
    serves: z.string().trim().max(80).nullable(),
    includes: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
    image_url: z.string().trim().max(500).nullable(),
    status: z.enum(["available", "unavailable", "archived"]),
    sort_order: z.number().int().min(0).max(9999),
  })
  .superRefine((v, ctx) => {
    if (isCakeDesignProduct(v.id ?? "", v.category_id)) return;
    if (v.price_cents == null && !isCakeDesignProduct(v.id ?? "", v.category_id)) {
      ctx.addIssue({
        code: "custom",
        message: "Every product needs a published price.",
        path: ["price_cents"],
      });
      return;
    }
    if (v.payment_rule === "deposit") {
      if (v.deposit_percent == null) {
        ctx.addIssue({
          code: "custom",
          message: "A custom-cake deposit needs a percentage.",
          path: ["deposit_percent"],
        });
      }
    }
    if (v.pack_size != null && !v.pack_unit) {
      ctx.addIssue({
        code: "custom",
        message: 'Say what the pack contains, for example "cupcakes".',
        path: ["pack_unit"],
      });
    }
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const isCanonicalCake = data.id ? isCustomCakeProduct(data.id) : false;
    if (isCanonicalCake) {
      if (data.slug !== CUSTOM_CAKE_PRODUCT_SLUG)
        throw new Error("Keep the main custom-cake web address unchanged.");
      if (data.payment_rule !== "deposit") {
        throw new Error("The custom celebration cake must use a percentage deposit.");
      }
      if (!data.category_id || !isCustomCakeCategory(data.category_id)) {
        throw new Error("The custom celebration cake must stay in the Custom cakes collection.");
      }
    } else if (isCakeDesignProduct(data.id ?? "", data.category_id)) {
      if (!data.category_id || !isCustomCakeCategory(data.category_id)) {
        throw new Error("Cake designs use the Custom cakes collection and its shared pricing.");
      }
    }
    const db = await admin();
    let previousImageUrl: string | null = null;
    if (data.id) {
      const { data: current, error } = await db
        .from("products")
        .select("image_url, category_id")
        .eq("id", data.id)
        .single();
      if (error) throw new Error(error.message);
      if (
        isCakeDesignProduct(data.id, current.category_id) !==
        isCakeDesignProduct(data.id, data.category_id)
      ) {
        throw new Error(
          "Keep this product in its current pricing collection. Create a new design instead of changing its pricing type.",
        );
      }
      previousImageUrl = current.image_url;
    }

    const row = {
      slug: data.slug,
      name: data.name,
      category_id: data.category_id,
      short: data.short,
      description: data.description,
      payment_rule: data.payment_rule,
      pricing_mode: (data.payment_rule === "deposit" ? "deposit" : "fixed") as "fixed" | "deposit",
      price_cents: isCakeDesignProduct(data.id ?? "", data.category_id) ? null : data.price_cents,
      deposit_cents: null,
      deposit_percent: data.payment_rule === "deposit" ? data.deposit_percent : null,
      price_band: null,
      price_note: data.price_note,
      pack_size: data.pack_size,
      pack_unit: data.pack_unit,
      lead_time: data.lead_time,
      serves: data.serves,
      includes: data.includes,
      image_url: data.image_url,
      status: data.status,
      sort_order: data.sort_order,
    };

    if (data.id) {
      const { error } = await db
        .from("products")
        .update(
          (({
            price_cents: _price,
            deposit_cents: _deposit,
            deposit_percent: _percent,
            payment_rule: _rule,
            pricing_mode: _mode,
            ...metadata
          }) => metadata)(row),
        )
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      if (previousImageUrl !== data.image_url) {
        await deleteUnreferencedProductImage(db, previousImageUrl);
      }
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await db.from("products").insert(row).select("id").single();
    if (error || !created) throw new Error(error?.message ?? "Could not create the product.");
    return { ok: true, id: created.id };
  });

/**
 * Hard delete is admin-only and refuses any product that appears in an order,
 * so historical orders keep their commercial meaning. Archive instead.
 */
export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (isCustomCakeProduct(data.id)) {
      throw new Error("The core custom cake cannot be deleted. Archive it instead.");
    }
    const db = await admin();

    const { data: current, error: currentError } = await db
      .from("products")
      .select("image_url")
      .eq("id", data.id)
      .single();
    if (currentError) throw new Error(currentError.message);

    const { count } = await db
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", data.id);
    if (count && count > 0) {
      throw new Error(
        "This cake appears in past orders, so it cannot be deleted. Archive it instead.",
      );
    }

    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await deleteUnreferencedProductImage(db, current.image_url);
    return { ok: true };
  });

const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ProductImageType = (typeof PRODUCT_IMAGE_TYPES)[number];

const IMAGE_EXTENSIONS: Record<ProductImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function hasImageSignature(bytes: Uint8Array, type: ProductImageType): boolean {
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte);
  }
  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

/**
 * Issues a short-lived upload token so image bytes travel directly from the
 * browser to Storage instead of crossing the server-function payload limit.
 */
export const adminCreateProductImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z
          .string()
          .trim()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
        content_type: z.enum(PRODUCT_IMAGE_TYPES),
        size_bytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const ext = IMAGE_EXTENSIONS[data.content_type];
    const path = `products/${data.slug}-${crypto.randomUUID()}.${ext}`;
    const { data: upload, error } = await db.storage
      .from("product-images")
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !upload) throw new Error("Could not prepare that image upload. Please try again.");
    return { path, token: upload.token };
  });

const PRODUCT_IMAGE_PATH = /^products\/[a-z0-9-]+-[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

/** Validates the uploaded bytes before the product may reference the object. */
export const adminFinalizeProductImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        path: z.string().regex(PRODUCT_IMAGE_PATH),
        content_type: z.enum(PRODUCT_IMAGE_TYPES),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: image, error } = await db.storage.from("product-images").download(data.path);
    if (error || !image) {
      await db.storage.from("product-images").remove([data.path]);
      throw new Error("Could not verify that image. Please try again.");
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    if (
      bytes.byteLength === 0 ||
      bytes.byteLength > MAX_IMAGE_BYTES ||
      image.type !== data.content_type ||
      !data.path.endsWith(`.${IMAGE_EXTENSIONS[data.content_type]}`) ||
      !hasImageSignature(bytes, data.content_type)
    ) {
      await db.storage.from("product-images").remove([data.path]);
      throw new Error("The uploaded file is not a valid supported image.");
    }

    return { image_url: `storage:${data.path}` };
  });

/** Removes an abandoned generated upload, but never an image referenced by a product. */
export const adminDiscardProductImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ path: z.string().regex(PRODUCT_IMAGE_PATH) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    await deleteUnreferencedProductImage(db, `storage:${data.path}`);
    return { ok: true };
  });

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  name: z.string().trim().min(2).max(120),
  blurb: z.string().trim().max(400).default(""),
  image_url: z.string().trim().max(500).nullable(),
  visible: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id && isCustomCakeCategory(id) && data.slug !== "celebration-cakes")
      throw new Error("Keep the Custom cakes collection web address unchanged.");
    if (id) {
      const { error } = await db.from("categories").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await db.from("categories").insert(row).select("id").single();
    if (error || !created) throw new Error(error?.message ?? "Could not create the collection.");
    return { ok: true, id: created.id };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data, error } = await db.from("settings").select("*").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const distanceBandSchema = z.object({
  max_km: z.number().min(0).max(500),
  fee_cents: z.number().int().min(0).max(100_000),
});

const settingsSchema = z
  .object({
    id: z.string().uuid(),
    bank_account_name: z.string().trim().max(120),
    bank_account_number: z.string().trim().max(60),
    bank_name: z.string().trim().max(120),
    bank_note: z.string().trim().max(400),
    whatsapp_number: z.string().trim().max(40),
    delivery_mode: z.enum(["pickup_only", "fixed_zones", "distance"]),
    delivery_origin_postal_code: z.string().trim().max(12).nullable(),
    delivery_distance_bands: z.array(distanceBandSchema).max(12).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.delivery_mode !== "distance") return;
    if (!v.delivery_origin_postal_code) {
      ctx.addIssue({
        code: "custom",
        message: "Distance pricing needs the postal code you deliver from.",
        path: ["delivery_origin_postal_code"],
      });
    }
    if (v.delivery_distance_bands.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one distance band, otherwise no fee can be worked out.",
        path: ["delivery_distance_bands"],
      });
    }
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { id, delivery_distance_bands, ...rest } = data;
    const patch = {
      ...rest,
      delivery_distance_config: {
        bands: [...delivery_distance_bands].sort((a, b) => a.max_km - b.max_km),
      },
    };
    const { error } = await db.from("settings").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Product option groups and choices
 * ------------------------------------------------------------------ */

export const adminListOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ product_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: groups, error } = await db
      .from("product_option_groups")
      .select("*")
      .eq("product_id", data.product_id)
      .order("sort_order");
    if (error) throw new Error(error.message);
    const ids = (groups ?? []).map((g) => g.id);
    const choices = ids.length
      ? ((
          await db
            .from("product_option_choices")
            .select("*")
            .in("group_id", ids)
            .order("sort_order")
        ).data ?? [])
      : [];
    return { groups: groups ?? [], choices };
  });

const keyRule = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens");

export const adminSaveOptionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        product_id: z.string().uuid(),
        key: keyRule,
        label: z.string().trim().min(1).max(120),
        required: z.boolean(),
        allow_multiple: z.boolean(),
        available: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { data: current, error: readError } = await db
        .from("product_option_groups")
        .select("product_id, key")
        .eq("id", id)
        .single();
      if (readError || !current) throw new Error("That option group no longer exists.");
      if (current.product_id !== data.product_id || current.key !== data.key) {
        throw new Error("Saved option identifiers cannot be changed.");
      }

      const rule = customCakeRuleGroup(id);
      if (
        rule &&
        (!isCustomCakeProduct(current.product_id) ||
          data.key !== rule.key ||
          data.required !== rule.required ||
          data.allow_multiple !== rule.allowMultiple ||
          !data.available)
      ) {
        throw new Error("Core cake-pricing rules cannot be hidden or restructured.");
      }

      const { error } = await db
        .from("product_option_groups")
        .update({
          label: row.label,
          required: row.required,
          allow_multiple: row.allow_multiple,
          available: row.available,
          sort_order: row.sort_order,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    if (isCustomCakeProduct(data.product_id)) {
      throw new Error("Custom-cake option groups are managed in the pricing configuration.");
    }
    const { data: created, error } = await db
      .from("product_option_groups")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that option group.");
    return { ok: true, id: created.id };
  });

export const adminDeleteOptionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: current, error: readError } = await db
      .from("product_option_groups")
      .select("product_id")
      .eq("id", data.id)
      .single();
    if (readError || !current) throw new Error("That option group no longer exists.");
    if (isCustomCakeProduct(current.product_id)) {
      throw new Error("Custom-cake option groups cannot be deleted.");
    }
    const { error: choicesError } = await db
      .from("product_option_choices")
      .delete()
      .eq("group_id", data.id);
    if (choicesError) throw new Error(choicesError.message);
    const { error } = await db.from("product_option_groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveOptionChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        group_id: z.string().uuid(),
        key: keyRule,
        label: z.string().trim().min(1).max(120),
        price_delta_cents: z.number().int().min(-100_000).max(1_000_000),
        available: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { data: current, error: readError } = await db
        .from("product_option_choices")
        .select("group_id, key")
        .eq("id", id)
        .single();
      if (readError || !current) throw new Error("That option choice no longer exists.");
      if (current.group_id !== data.group_id || current.key !== data.key) {
        throw new Error("Saved option identifiers cannot be changed.");
      }

      const { error } = await db
        .from("product_option_choices")
        .update({
          label: row.label,
          available: row.available,
          sort_order: row.sort_order,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: group, error: groupError } = await db
      .from("product_option_groups")
      .select("product_id")
      .eq("id", data.group_id)
      .single();
    if (groupError || !group) throw new Error("That option group no longer exists.");
    if (isCustomCakeProduct(group.product_id)) {
      throw new Error("Custom-cake choices are managed in the pricing configuration.");
    }
    const { data: created, error } = await db
      .from("product_option_choices")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that choice.");
    return { ok: true, id: created.id };
  });

export const adminDeleteOptionChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: current, error: readError } = await db
      .from("product_option_choices")
      .select("group_id")
      .eq("id", data.id)
      .single();
    if (readError || !current) throw new Error("That option choice no longer exists.");
    if (isCustomCakeOptionGroup(current.group_id)) {
      throw new Error("Custom-cake choices cannot be deleted.");
    }
    const { error } = await db.from("product_option_choices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Delivery zones
 * ------------------------------------------------------------------ */

export const adminListDeliveryZones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data, error } = await db.from("delivery_zones").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        postal_prefixes: z
          .array(
            z
              .string()
              .trim()
              .min(1)
              .max(6)
              .transform((s) => s.toUpperCase().replace(/\s/g, "")),
          )
          .min(1)
          .max(60),
        fee_cents: z.number().int().min(0).max(100_000),
        active: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { error } = await db.from("delivery_zones").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await db
      .from("delivery_zones")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that zone.");
    return { ok: true, id: created.id };
  });

export const adminDeleteDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("delivery_zones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
