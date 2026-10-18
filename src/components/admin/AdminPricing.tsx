import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminPricing, saveAdminPricing } from "@/lib/admin-pricing.functions";
import { isCustomCakeProduct } from "@/lib/custom-cake-contract";
import { isCakeDesignProduct } from "@/lib/cake-designs";
import { formatMoney } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  capturePricingSnapshot,
  pricingSnapshotChanged,
  type PricingSnapshot,
} from "@/lib/admin-pricing-snapshot";
function cents(value: string) {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error("Enter a valid CAD amount with at most two decimal places.");
  return Math.round(Number(value) * 100);
}
export function AdminPricing({ productId }: { productId?: string | undefined } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-pricing"], queryFn: () => getAdminPricing() });
  const [id, setId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [rule, setRule] = useState<"full" | "deposit">("full");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<PricingSnapshot | null>(null);
  const product = snapshot?.product;
  const groups = snapshot?.groups ?? [];
  const choices = snapshot?.choices ?? [];
  const stale = !!(snapshot && query.data && pricingSnapshotChanged(snapshot, query.data));
  function choose(next: string) {
    const captured = query.data && capturePricingSnapshot(query.data, next);
    if (!captured) return;
    const p = captured.product;
    setSnapshot(captured);
    setId(next);
    setRule(p.payment_rule ?? "full");
    setReview(false);
    setValues({
      base: String((p.price_cents ?? 0) / 100),
      deposit: String(p.deposit_percent ?? 70),
      buttercream: String((p.buttercream_minimum_cents ?? 13000) / 100),
      fondant: String((p.fondant_minimum_cents ?? 28000) / 100),
      ...Object.fromEntries(
        captured.choices.map((c) => [c.id, String(c.price_delta_cents / 100)]),
      ),
    });
  }
  useEffect(() => {
    if (productId && query.data && id !== productId) choose(productId);
  }, [productId, query.data, id]);
  async function save() {
    if (!product || stale) return;
    setBusy(true);
    try {
      await saveAdminPricing({
        data: {
          id,
          updated_at: product.updated_at,
          price_cents: cents(values["base"]!),
          payment_rule: rule,
          deposit_percent: Number(values["deposit"]),
          buttercream_minimum_cents: isCustomCakeProduct(id) ? cents(values["buttercream"]!) : null,
          fondant_minimum_cents: isCustomCakeProduct(id) ? cents(values["fondant"]!) : null,
          expected_choices: choices,
          choices: choices.map((c) => ({ id: c.id, price_delta_cents: cents(values[c.id]!) })),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-pricing"] }),
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
      ]);
      setId("");
      setSnapshot(null);
      setReview(false);
      toast.success("Pricing saved. The product page and Pricing page use these same values.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save pricing.");
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending) return <p>Loading pricing…</p>;
  if (query.error) return <p role="alert">{query.error.message}</p>;
  const field = (key: string, label: string, old: number | string) => (
    <label className="block space-y-1" key={key}>
      <span>{label}</span>
      {review ? (
        <p>
          {typeof old === "number" ? formatMoney(old) : old} →{" "}
          {key === "deposit" ? `${values[key]}%` : formatMoney(cents(values[key]!))}
        </p>
      ) : (
        <Input
          aria-label={label}
          value={values[key] ?? ""}
          inputMode="decimal"
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        />
      )}
    </label>
  );
  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl">Pricing</h2>
      <p className="text-sm text-muted-foreground">
        One pricing source for product pages and the public Pricing page. Review all changes before
        saving; concurrent edits require a reload.
      </p>
      {productId ? (
        <p className="text-sm font-medium">Editing prices for {product?.name ?? "this product"}</p>
      ) : <label className="block">
        Product
        <select
          aria-label="Product"
          className="block w-full rounded border p-2"
          value={id}
          disabled={busy || review}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Choose a product</option>
          {query.data?.products
            .filter(
              (p) =>
                !isCakeDesignProduct(p.id, p.category_id) &&
                p.category_id &&
                [
                  "382b2742-6d74-4a4c-9a1f-dabaf5755a2d",
                  "696773f9-538d-464b-becb-02989fadb3fd",
                  "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d501",
                ].includes(p.category_id),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>}
      {product && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (stale) return;
            try {
              Object.entries(values).forEach(([k, v]) => (k === "deposit" ? null : cents(v)));
              setReview(true);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Invalid price");
            }
          }}
        >
          {stale && (
            <div role="alert" className="space-y-3 rounded border border-border p-4">
              <p>Pricing changed since you opened this editor. Reload before reviewing or saving.</p>
              <Button type="button" variant="outline" onClick={() => choose(id)}>
                Reload pricing and discard these edits
              </Button>
            </div>
          )}
          {review && <h3 className="font-display text-xl">Review pricing changes</h3>}
          {field("base", "Base price (CAD)", product.price_cents ?? 0)}
          <label className="block">
            Payment rule
            <select
              aria-label="Payment rule"
              className="block rounded border p-2"
              value={rule}
              disabled={review || isCustomCakeProduct(id)}
              onChange={(e) => setRule(e.target.value as "full" | "deposit")}
            >
              <option value="full">Pay in full</option>
              <option value="deposit">Percentage deposit</option>
            </select>
          </label>
          {rule === "deposit" &&
            field("deposit", "Deposit (%)", `${product.deposit_percent ?? 70}%`)}
          {isCustomCakeProduct(id) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                "buttercream",
                "Buttercream minimum (CAD)",
                product.buttercream_minimum_cents ?? 13000,
              )}
              {field("fondant", "Fondant minimum (CAD)", product.fondant_minimum_cents ?? 28000)}
            </div>
          )}
          {groups.map((g) => (
            <fieldset className="space-y-3 rounded border p-4" key={g.id}>
              <legend>{g.label}</legend>
              {choices
                .filter((c) => c.group_id === g.id)
                .map((c) => field(c.id, `${c.label} — adjustment (CAD)`, c.price_delta_cents))}
            </fieldset>
          ))}
          {review ? (
            <div className="flex gap-3">
              <Button type="button" disabled={busy || stale} onClick={save}>
                {busy ? "Saving…" : "Confirm and save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setReview(false)}
              >
                Back to edit
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={stale}>Review changes</Button>
          )}
        </form>
      )}
    </section>
  );
}
