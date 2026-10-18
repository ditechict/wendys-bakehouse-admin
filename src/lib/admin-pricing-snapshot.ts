import type { getAdminPricing } from "./admin-pricing.functions";

type PricingData = Awaited<ReturnType<typeof getAdminPricing>>;

/** Hold the version the administrator actually reviewed, across cache refreshes. */
export function capturePricingSnapshot(data: PricingData, id: string) {
  const product = data.products.find((p) => p.id === id);
  if (!product) return null;
  const groups = data.groups.filter((g) => g.product_id === id).sort((a, b) => a.id.localeCompare(b.id));
  const groupIds = new Set(groups.map((g) => g.id));
  return structuredClone({
    product,
    groups,
    choices: data.choices.filter((c) => groupIds.has(c.group_id)).sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export type PricingSnapshot = NonNullable<ReturnType<typeof capturePricingSnapshot>>;

export function pricingSnapshotChanged(snapshot: PricingSnapshot, data: PricingData): boolean {
  const latest = capturePricingSnapshot(data, snapshot.product.id);
  return !latest || JSON.stringify(latest) !== JSON.stringify(snapshot);
}
