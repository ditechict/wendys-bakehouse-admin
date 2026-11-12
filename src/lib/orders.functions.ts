import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  itemSchema,
  orderSchema,
  slipSchema,
  MAX_SLIP_BYTES,
  SLIP_EXTENSIONS,
  type PlaceOrderInput,
} from "@/lib/order-schemas";

export type { PlaceOrderInput };

function decodeBase64(data: string): Uint8Array {
  const clean = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPricedOrder } = await import("@/lib/order-create.server");

    const isTransfer = data.checkout_method === "bank_transfer";

    // Every price, and the delivery fee, is recalculated server-side from
    // current rows; order + items are written in one database transaction.
    const { id, reference, cart, lines } = await createPricedOrder(data, {
      checkout_method: data.checkout_method,
      payment_provider: isTransfer ? "bank_transfer" : "whatsapp",
      payment_status: "not_paid",
      payer_name: data.payer_name ?? null,
      transfer_reference: data.transfer_reference ?? null,
      transfer_date: data.transfer_date || null,
    });

    const { issueOrderAccess } = await import("@/lib/order-access.server");
    const orderAccessToken = isTransfer ? issueOrderAccess(id) : null;
    return {
      orderAccessToken,
      reference,
      dueNowCents: cart.due_now_cents,
      subtotalCents: cart.subtotal_cents,
      deliveryFeeCents: cart.delivery.fee_cents,
      totalCents: cart.total_cents,
      balanceCents: cart.balance_cents,
      hasQuoteItems: false,
      slipUploaded: false,
      lines: lines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        pricing_mode: l.pricing_mode,
        payment_rule: l.payment_rule,
        unit_price_cents: l.unit_price_cents,
        line_total_cents: l.line_total_cents,
        line_due_now_cents: l.line_due_now_cents,
        deposit_cents: l.deposit_cents,
        deposit_percent: l.deposit_percent,
        options: l.options,
      })),
    };
  });

/**
 * Authoritative checkout preview. The browser never computes money; it asks
 * here and renders exactly what comes back.
 */
export const previewCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        fulfilment: z.enum(["pickup", "delivery"]),
        delivery_postal_code: z.string().trim().max(12).optional(),
        items: z.array(itemSchema).min(1).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { priceCart, PricingError } = await import("@/lib/pricing.server");
    try {
      const cart = await priceCart(
        data.items.map((i) => ({
          slug: i.slug,
          quantity: i.quantity,
          choices: i.choices,
          notes: i.notes ?? null,
        })),
        data.fulfilment,
        data.delivery_postal_code ?? null,
      );
      return { ok: true as const, cart };
    } catch (error) {
      return {
        ok: false as const,
        message:
          error instanceof PricingError
            ? error.message
            : "We could not work out your total. Please try again.",
      };
    }
  });

/** Public, reference-only payment lookup used by the card confirmation page. */
export const getOrderPaymentState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ reference: z.string().trim().min(4).max(40) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("reference, payment_status, due_now_cents, balance_cents, total_cents")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!order) return { found: false as const };
    return {
      found: true as const,
      reference: order.reference,
      payment_status: order.payment_status,
      due_now_cents: order.due_now_cents,
      balance_cents: order.balance_cents,
      total_cents: order.total_cents,
    };
  });

/** Separate proof submission: never marks an order paid; staff must verify it. */
export const submitTransferProof = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => z.object({
    token: z.string().min(20).max(1024),
    payer_name: z.string().trim().min(1).max(100),
    transfer_reference: z.string().trim().max(80).optional(),
    transfer_date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(),
    slip: slipSchema,
  }).parse(value))
  .handler(async ({ data }) => {
    const { verifyOrderAccess } = await import("@/lib/order-access.server");
    const id = verifyOrderAccess(data.token);
    if (!id) throw new Error("This payment link is invalid or expired.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: lookupError } = await supabaseAdmin.from("orders")
      .select("id, checkout_method, payment_status").eq("id", id).maybeSingle();
    if (lookupError || !order || order.checkout_method !== "bank_transfer" ||
        order.payment_status !== "not_paid") throw new Error("Payment evidence cannot be submitted for this order.");
    const bytes = decodeBase64(data.slip.data_base64);
    if (bytes.byteLength > MAX_SLIP_BYTES) throw new Error("Payment slip is too large.");
    const path = id + "/slip-" + crypto.randomUUID() + "." + SLIP_EXTENSIONS[data.slip.content_type];
    const { error: uploadError } = await supabaseAdmin.storage.from("payment-slips")
      .upload(path, bytes, { contentType: data.slip.content_type, upsert: false });
    if (uploadError) throw new Error("Payment evidence could not be uploaded.");
    const { data: updated, error: updateError } = await supabaseAdmin.from("orders")
      .update({
        slip_path: path, payer_name: data.payer_name,
        transfer_reference: data.transfer_reference || null,
        transfer_date: data.transfer_date || null,
        payment_status: "pending_verification",
      })
      .eq("id", id).eq("payment_status", "not_paid")
      .select("id").maybeSingle();
    if (updateError || !updated) {
      await supabaseAdmin.storage.from("payment-slips").remove([path]);
      throw new Error("Order changed while submitting evidence.");
    }
    return { ok: true };
  });
