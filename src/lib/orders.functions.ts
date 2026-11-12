import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  itemSchema,
  orderSchema,
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

    // The slip is decoded and size-checked before anything is written, so a
    // rejected file never leaves a half-finished order behind.
    let slipBytes: Uint8Array | null = null;
    if (data.slip) {
      slipBytes = decodeBase64(data.slip.data_base64);
      if (slipBytes.byteLength > MAX_SLIP_BYTES) {
        throw new Error("That payment slip is larger than 5MB. Please upload a smaller file.");
      }
    }

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

    let slipUploaded = false;
    if (data.slip && slipBytes) {
      // The file name is never used to build the storage path: the extension is
      // derived from the validated content type, so nothing can escape the
      // order's own folder.
      const ext = SLIP_EXTENSIONS[data.slip.content_type];
      const path = `${id}/slip.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("payment-slips")
        .upload(path, slipBytes, { contentType: data.slip.content_type, upsert: true });
      if (uploadError) {
        // The order stands; it is simply flagged as missing evidence.
        await supabaseAdmin
          .from("orders")
          .update({
            notes: [data.notes, "[Payment slip upload failed]"].filter(Boolean).join("\n"),
          })
          .eq("id", id);
      } else {
        slipUploaded = true;
        await supabaseAdmin.from("orders").update({ slip_path: path }).eq("id", id);
      }
    }

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
      slipUploaded,
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
