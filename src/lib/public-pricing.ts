import { isCustomCakeProduct, CUSTOM_CAKE_RULE_GROUPS } from "./custom-cake-contract";
type Choice = { key: string; price_delta_cents: number };
type Group = {
  id?: string;
  key: string;
  required: boolean;
  allow_multiple: boolean;
  choices: Choice[];
};
type Product = {
  id: string;
  price_cents: number | null;
  buttercream_minimum_cents?: number | null;
  fondant_minimum_cents?: number | null;
};
function totals(groups: Group[]): Set<number> | null {
  let sums = new Set([0]);
  let work = 0;
  for (const g of groups) {
    const values = new Set<number>(g.required ? [] : [0]);
    if (g.allow_multiple) {
      const subsets = new Set([0]);
      for (const c of g.choices) {
        const added = [...subsets].map((v) => v + c.price_delta_cents);
        for (const v of added) {
          subsets.add(v);
          values.add(v);
        }
        if (subsets.size > 100000) return null;
      }
    } else for (const c of g.choices) values.add(c.price_delta_cents);
    if ((work += sums.size * values.size) > 2000000) return null;
    const next = new Set<number>();
    for (const a of sums)
      for (const b of values) {
        next.add(a + b);
        if (next.size > 100000) return null;
      }
    sums = next;
  }
  return sums;
}
/** Lowest attainable configured total; never advertise an unorderable base. */
export function startingPrice(p: Product, groups: Group[]): number | null {
  if (p.price_cents == null) return null;
  let best = Infinity;
  if (!isCustomCakeProduct(p.id)) {
    const sums = totals(groups);
    if (!sums) return null;
    for (const delta of sums) {
      const total = p.price_cents + delta;
      if (total >= 0) best = Math.min(best, total);
    }
  } else {
    for (const rule of Object.values(CUSTOM_CAKE_RULE_GROUPS)) {
      const g = groups.find((g) => g.id === rule.id);
      if (
        !g ||
        g.key !== rule.key ||
        g.required !== rule.required ||
        g.allow_multiple !== rule.allowMultiple
      )
        return null;
    }
    const size = groups.find((g) => g.key === "size-layers");
    const extra = groups.find((g) => g.key === "extra-tiers");
    const fee = groups.find((g) => g.key === "tiering-fee");
    const fondant = groups.find((g) => g.key === "fondant-covering");
    if (
      !size ||
      !extra ||
      !fee ||
      !fondant ||
      p.buttercream_minimum_cents == null ||
      p.fondant_minimum_cents == null
    )
      return null;
    const structural = new Set(["size-layers", "extra-tiers", "tiering-fee", "fondant-covering"]);
    const sums = totals(groups.filter((g) => !structural.has(g.key)));
    if (!sums) return null;
    const second = [null, ...extra.choices.filter((c) => c.key.startsWith("second-tier-"))];
    const third = [null, ...extra.choices.filter((c) => c.key.startsWith("third-tier-"))];
    for (const base of size.choices)
      for (const s of second)
        for (const t of third) {
          if (t && !s) continue;
          const count = 1 + Number(!!s) + Number(!!t);
          if (count > 1 && !base.key.endsWith("3-layers")) continue;
          const sizes = [
            base.key.match(/^(6|8|10)-inch/)?.[1],
            ...[s, t].filter(Boolean).map((c) => c!.key.match(/(6|8|10)-inch$/)?.[1]),
          ];
          if (sizes.some((x) => !x) || new Set(sizes).size !== sizes.length) continue;
          const stacking =
            count === 1 ? null : fee.choices.find((c) => c.key === `tiering-${count}-tiers`);
          if (count > 1 && !stacking) continue;
          const finishes = [
            null,
            ...fondant.choices.filter(
              (c) => c.key === `fondant-${count}-${count === 1 ? "tier" : "tiers"}`,
            ),
          ];
          for (const finish of finishes)
            for (const delta of sums) {
              const total =
                p.price_cents +
                base.price_delta_cents +
                (s?.price_delta_cents ?? 0) +
                (t?.price_delta_cents ?? 0) +
                (stacking?.price_delta_cents ?? 0) +
                (finish?.price_delta_cents ?? 0) +
                delta;
              const minimum = finish ? p.fondant_minimum_cents : p.buttercream_minimum_cents;
              if (total >= minimum) best = Math.min(best, total);
            }
        }
  }
  return Number.isFinite(best) ? best : null;
}
