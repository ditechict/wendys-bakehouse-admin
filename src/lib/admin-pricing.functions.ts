import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isCakeDesignProduct } from "./cake-designs";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "./database.types";
async function adminClient(context: { supabase: unknown }) {
  const user = context.supabase as SupabaseClient<AppDatabase>;
  const role = await user.rpc("is_admin");
  if (role.error || role.data !== true) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<AppDatabase>;
}
export const getAdminPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const [p, g, c] = await Promise.all([
      db.from("products").select("*").order("sort_order"),
      db.from("product_option_groups").select("*"),
      db.from("product_option_choices").select("*").order("id"),
    ]);
    if (p.error || g.error || c.error) throw new Error("Unable to load pricing.");
    return { products: p.data!, groups: g.data!, choices: c.data! };
  });
const payload = z.object({
  id: z.string().uuid(),
  updated_at: z.string(),
  price_cents: z.number().int().min(0).max(10000000),
  payment_rule: z.enum(["full", "deposit"]),
  deposit_percent: z.number().int().min(1).max(100),
  buttercream_minimum_cents: z.number().int().min(1).max(10000000).nullable(),
  fondant_minimum_cents: z.number().int().min(1).max(10000000).nullable(),
  expected_choices: z.array(z.record(z.unknown())),
  choices: z.array(
    z.object({
      id: z.string().uuid(),
      price_delta_cents: z.number().int().min(-100000).max(10000000),
    }),
  ),
});
export const saveAdminPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => payload.parse(v))
  .handler(async ({ context, data }) => {
    const db = await adminClient(context);
    const current = await db.from("products").select("id, category_id").eq("id", data.id).single();
    if (current.error || !current.data) throw new Error("Product not found.");
    if (isCakeDesignProduct(data.id, current.data.category_id))
      throw new Error("Edit the Custom celebration cake pricing; design listings inherit it.");
    const rpc = db as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    };
    const result = await rpc.rpc("admin_save_pricing_v2", {
      p_actor: context.userId,
      p_payload: data,
    });
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
