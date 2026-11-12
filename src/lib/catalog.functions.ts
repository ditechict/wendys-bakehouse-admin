import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { startingPrice } from "./public-pricing";
import { isCakeCollection } from "./cake-only-catalog";
import { isCakeDesignProduct } from "./cake-designs";
import { CUSTOM_CAKE_PRODUCT_ID } from "./custom-cake-contract";
import type { AppDatabase } from "@/lib/database.types";

function publicClient() {
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  return createClient<AppDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, {
          ...init,
          headers: h,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
            : AbortSignal.timeout(10_000),
        });
      },
    },
  });
}

/** Public catalogue read: categories, available products and shop settings. */
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  // The settings row is admin-only in the Data API, so the one public field
  // (the WhatsApp number) is read server-side with the trusted client.
  const [cats, prods, settings, groups, choices] = await Promise.all([
    supabase.from("categories").select("*").eq("visible", true).order("sort_order"),
    supabase
      .from("products")
      .select("*")
      .eq("available", true)
      .eq("status", "available")
      .order("sort_order"),
    Promise.resolve({ data: null }),
    supabase
      .from("product_option_groups")
      .select("id, product_id, key, label, required, allow_multiple, available, sort_order")
      .eq("available", true)
      .order("sort_order"),
    supabase
      .from("product_option_choices")
      .select("id, group_id, key, label, price_delta_cents, available, sort_order")
      .eq("available", true)
      .order("sort_order"),
  ]);

  if (cats.error) throw new Error(cats.error.message);
  if (prods.error) throw new Error(prods.error.message);
  if (groups.error) throw new Error(groups.error.message);
  if (choices.error) throw new Error(choices.error.message);

  const categories = (cats.data ?? []).filter((c) => isCakeCollection(c.slug));
  const categoryIds = new Set(categories.map((c) => c.id));
  const listedProducts = (prods.data ?? []).filter(
    (p) => p.category_id && categoryIds.has(p.category_id),
  );
  const canonical = listedProducts.find((p) => p.id === CUSTOM_CAKE_PRODUCT_ID);
  const products = listedProducts.filter(
    (p) => !isCakeDesignProduct(p.id, p.category_id) || canonical,
  );
  const productIds = new Set(products.map((p) => p.id));
  const optionGroups = (groups.data ?? []).filter((g) => productIds.has(g.product_id));
  const groupIds = new Set(optionGroups.map((g) => g.id));
  return {
    categories,
    products: products.map((p) => {
      const source = isCakeDesignProduct(p.id, p.category_id) ? canonical! : p;
      return {
        ...p,
        price_cents: source.price_cents,
        payment_rule: source.payment_rule,
        pricing_mode: source.pricing_mode,
        deposit_percent: source.deposit_percent,
        deposit_cents: source.deposit_cents,
        buttercream_minimum_cents: source.buttercream_minimum_cents,
        fondant_minimum_cents: source.fondant_minimum_cents,
        starting_price_cents: startingPrice(
          source,
          optionGroups
            .filter((g) => g.product_id === source.id)
            .map((g) => ({
              ...g,
              choices: (choices.data ?? []).filter((c) => c.group_id === g.id),
            })),
        ),
      };
    }),
    settings: settings.data ?? null,
    option_groups: optionGroups,
    option_choices: (choices.data ?? []).filter((c) => groupIds.has(c.group_id)),
  };
});

/** Only a persisted bank-transfer order holder may access payment instructions. */
export const getBankDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(20).max(1024) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyOrderAccess } = await import("@/lib/order-access.server");
    const id = verifyOrderAccess(data.token);
    if (!id) throw new Error("This payment link is invalid or expired.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin.from("orders")
      .select("id, checkout_method, payment_status").eq("id", id).maybeSingle();
    if (error || !order || order.checkout_method !== "bank_transfer" ||
        !["not_paid", "pending_verification"].includes(order.payment_status)) {
      throw new Error("Bank transfer details are unavailable for this order.");
    }
    const { data: settings, error: settingsError } = await supabaseAdmin.from("settings")
      .select("bank_account_name, bank_account_number, bank_name, bank_note").limit(1).maybeSingle();
    if (settingsError || !settings?.bank_account_number || !settings.bank_name) {
      throw new Error("Bank details are not configured. Contact the bakery.");
    }
    return settings;
  });
