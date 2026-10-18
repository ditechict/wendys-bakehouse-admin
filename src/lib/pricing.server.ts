import { CAKE_COLLECTION_SLUGS } from "./cake-only-catalog";
import { isCakeDesignProduct } from "./cake-designs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CUSTOM_CAKE_CATEGORY_ID,
  CUSTOM_CAKE_RULE_GROUPS,
  isCustomCakeProduct,
} from "./custom-cake-contract";
import type { AppDatabase } from "./database.types";

/**
 * The single authoritative pricing engine.
 *
 * Callers may only ever send a product slug, a quantity and the stable
 * identifiers of the option choices they picked. Every monetary value is
 * reloaded from the database here, in integer cents. The browser can never
 * influence a price.
 */

export type SelectedChoice = {
  group_key: string;
  choice_key: string;
};

export type LineRequest = {
  slug: string;
  quantity: number;
  choices: SelectedChoice[];
  notes?: string | null;
};

export type OptionSnapshot = {
  group_key: string;
  group_label: string;
  choice_key: string;
  choice_label: string;
  price_delta_cents: number;
};

export type PricedLine = {
  product_id: string;
  product_slug: string;
  name: string;
  quantity: number;
  pack_size: number | null;
  pack_unit: string | null;
  payment_rule: "full" | "deposit";
  base_price_cents: number;
  options_total_cents: number;
  unit_total_cents: number;
  line_total_cents: number;
  line_due_now_cents: number;
  deposit_cents: number | null;
  deposit_percent: number | null;
  options_snapshot: OptionSnapshot[];
  options: Record<string, string>;
  notes: string | null;
  lead_time: string;
};

export type DeliveryResult = {
  mode: "pickup_only" | "fixed_zones" | "distance";
  fulfilment: "pickup" | "delivery";
  fee_cents: number;
  postal_code: string | null;
  zone_name: string | null;
  detail: string | null;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotal_cents: number;
  delivery: DeliveryResult;
  total_cents: number;
  due_now_cents: number;
  balance_cents: number;
  requires_deposit: boolean;
};

export class PricingError extends Error {}

/** Reads a lead time such as "5 days" or "2 weeks" into whole days. */
export function leadTimeDays(text: string | null | undefined): number {
  if (!text) return 0;
  const match = /(\d+)\s*(day|week)/i.exec(text);
  if (!match) return 0;
  const n = Number(match[1]);
  return /week/i.test(match[2] ?? "") ? n * 7 : n;
}

export function normalisePostalCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<AppDatabase>;
}

/** Prices a set of requested lines against current, authoritative product data. */
export async function priceLines(requests: LineRequest[]): Promise<PricedLine[]> {
  if (requests.length === 0) throw new PricingError("Your basket is empty.");
  const supabase = await db();

  const slugs = [...new Set(requests.map((r) => r.slug))];
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, status, available, updated_at, buttercream_minimum_cents, fondant_minimum_cents, lead_time, price_cents, deposit_cents, deposit_percent, payment_rule, pack_size, pack_unit, category_id",
    )
    .in("slug", slugs);
  if (error) throw new PricingError("We could not load the menu. Please try again.");

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .in("slug", CAKE_COLLECTION_SLUGS)
    .eq("visible", true);
  if (categoryError) throw new PricingError("We could not load the menu. Please try again.");
  const categoryIds = new Set((categories ?? []).map((c) => c.id));
  const bySlug = new Map((products ?? []).map((p) => [p.slug, p]));
  for (const slug of slugs) {
    const product = bySlug.get(slug);
    if (!product) throw new PricingError(`"${slug}" is no longer on the menu.`);
    if (isCakeDesignProduct(product.id, product.category_id)) {
      throw new PricingError(
        "Choose this design through the custom-cake configurator before ordering.",
      );
    }
    if (
      !product.category_id ||
      !categoryIds.has(product.category_id) ||
      !product.available ||
      product.status !== "available"
    ) {
      throw new PricingError(`${product.name} is not available to order right now.`);
    }
    if (product.price_cents == null) {
      throw new PricingError(`${product.name} has no published price and cannot be ordered.`);
    }
    if (
      product.payment_rule === "deposit" &&
      product.deposit_cents == null &&
      product.deposit_percent == null
    ) {
      throw new PricingError(`${product.name} has an incomplete payment setup.`);
    }
    if (isCustomCakeProduct(product.id)) {
      if (product.payment_rule !== "deposit") {
        throw new PricingError(`${product.name} has an incomplete payment setup.`);
      }
      if (product.category_id !== CUSTOM_CAKE_CATEGORY_ID) {
        throw new PricingError(
          `${product.name} is temporarily unavailable because its setup needs attention.`,
        );
      }
    }
  }

  const productIds = [...bySlug.values()].map((p) => p.id);
  const { data: groups, error: groupsError } = await supabase
    .from("product_option_groups")
    .select("id, product_id, key, label, required, allow_multiple, available, sort_order")
    .in("product_id", productIds);
  if (groupsError)
    throw new PricingError("We could not load the product choices. Please try again.");

  const groupIds = (groups ?? []).map((group) => group.id);
  const choicesResult = groupIds.length
    ? await supabase
        .from("product_option_choices")
        .select("id, group_id, key, label, price_delta_cents, available")
        .in("group_id", groupIds)
    : null;
  if (choicesResult?.error) {
    throw new PricingError("We could not load the product choices. Please try again.");
  }
  const choices = choicesResult?.data ?? [];

  const groupsByProduct = new Map<string, NonNullable<typeof groups>>();
  for (const g of groups ?? []) {
    const list = groupsByProduct.get(g.product_id) ?? [];
    list.push(g);
    groupsByProduct.set(g.product_id, list);
  }
  const choicesByGroup = new Map<string, NonNullable<typeof choices>>();
  for (const c of choices ?? []) {
    const list = choicesByGroup.get(c.group_id) ?? [];
    list.push(c);
    choicesByGroup.set(c.group_id, list);
  }

  const priced = requests.map((request) => {
    const product = bySlug.get(request.slug)!;
    const allProductGroups = groupsByProduct.get(product.id) ?? [];
    const requireCakeGroup = (
      rule: (typeof CUSTOM_CAKE_RULE_GROUPS)[keyof typeof CUSTOM_CAKE_RULE_GROUPS],
    ) => {
      const group = allProductGroups.find((candidate) => candidate.id === rule.id);
      if (
        !group ||
        group.key !== rule.key ||
        !group.available ||
        group.required !== rule.required ||
        group.allow_multiple !== rule.allowMultiple
      ) {
        throw new PricingError(
          `${product.name} is temporarily unavailable because its options need attention.`,
        );
      }
      return group;
    };
    const cakeGroups = isCustomCakeProduct(product.id)
      ? {
          sizeLayers: requireCakeGroup(CUSTOM_CAKE_RULE_GROUPS.sizeLayers),
          extraTiers: requireCakeGroup(CUSTOM_CAKE_RULE_GROUPS.extraTiers),
          fondantCovering: requireCakeGroup(CUSTOM_CAKE_RULE_GROUPS.fondantCovering),
          tieringFee: requireCakeGroup(CUSTOM_CAKE_RULE_GROUPS.tieringFee),
        }
      : null;
    const productGroups = allProductGroups.filter((g) => g.available);
    const groupByKey = new Map(productGroups.map((g) => [g.key, g]));

    const seenGroups = new Set<string>();
    const seenChoices = new Set<string>();
    const selectedByGroupId = new Map<string, OptionSnapshot[]>();
    const snapshot: OptionSnapshot[] = [];
    let optionsTotal = 0;

    for (const selection of request.choices) {
      const group = groupByKey.get(selection.group_key);
      if (!group) {
        throw new PricingError(
          `${product.name} no longer offers that option. Rebuild your basket.`,
        );
      }
      const selectionKey = `${group.key}:${selection.choice_key}`;
      if (seenChoices.has(selectionKey)) {
        throw new PricingError(`${selection.choice_key} was chosen twice for ${product.name}.`);
      }
      if (!group.allow_multiple && seenGroups.has(group.key)) {
        throw new PricingError(`${group.label} was chosen twice for ${product.name}.`);
      }
      seenGroups.add(group.key);
      seenChoices.add(selectionKey);

      const choice = (choicesByGroup.get(group.id) ?? []).find(
        (c) => c.key === selection.choice_key,
      );
      if (!choice) {
        throw new PricingError(`That ${group.label.toLowerCase()} is no longer offered.`);
      }
      if (!choice.available) {
        throw new PricingError(`${choice.label} is sold out for ${product.name}.`);
      }
      optionsTotal += choice.price_delta_cents;
      const selected = {
        group_key: group.key,
        group_label: group.label,
        choice_key: choice.key,
        choice_label: choice.label,
        price_delta_cents: choice.price_delta_cents,
      };
      snapshot.push(selected);
      const groupSelections = selectedByGroupId.get(group.id) ?? [];
      groupSelections.push(selected);
      selectedByGroupId.set(group.id, groupSelections);
    }

    for (const group of productGroups) {
      if (group.required && !seenGroups.has(group.key)) {
        throw new PricingError(`Choose a ${group.label.toLowerCase()} for ${product.name}.`);
      }
    }

    const base = product.price_cents!;
    const unitTotal = base + optionsTotal;
    if (unitTotal < 0) throw new PricingError(`${product.name} is misconfigured.`);

    if (cakeGroups) {
      const sizeSelections = selectedByGroupId.get(cakeGroups.sizeLayers.id) ?? [];
      if (sizeSelections.length !== 1) {
        throw new PricingError(`Choose a size and layer count for ${product.name}.`);
      }
      const sizeAndLayers = sizeSelections[0]!;
      const extraTiers = selectedByGroupId.get(cakeGroups.extraTiers.id) ?? [];
      const secondTiers = extraTiers.filter((choice) =>
        choice.choice_key.startsWith("second-tier-"),
      );
      const thirdTiers = extraTiers.filter((choice) => choice.choice_key.startsWith("third-tier-"));
      const tieringFees = selectedByGroupId.get(cakeGroups.tieringFee.id) ?? [];
      const tieringFee = tieringFees[0];

      if (
        secondTiers.length + thirdTiers.length !== extraTiers.length ||
        secondTiers.length > 1 ||
        thirdTiers.length > 1
      ) {
        throw new PricingError("Choose only one cake size for each extra tier.");
      }
      if (thirdTiers.length > 0 && secondTiers.length === 0) {
        throw new PricingError("Add a second tier before choosing a third tier.");
      }
      if (extraTiers.length > 0 && !sizeAndLayers.choice_key.endsWith("3-layers")) {
        throw new PricingError("Every tiered cake starts with a three-layer base cake.");
      }

      const tierCount = 1 + extraTiers.length;
      const expectedTieringFee =
        tierCount === 2 ? "tiering-2-tiers" : tierCount === 3 ? "tiering-3-tiers" : null;
      if (expectedTieringFee !== (tieringFee?.choice_key ?? null)) {
        throw new PricingError(
          expectedTieringFee
            ? `Choose the ${tierCount}-tier stacking fee for this cake.`
            : "Remove the tiering fee unless you add another cake tier.",
        );
      }

      if (extraTiers.length > 0) {
        const sizes = [
          sizeAndLayers.choice_key.match(/^(6|8|10)-inch/)?.[1],
          ...extraTiers.map((choice) => choice.choice_key.match(/(6|8|10)-inch$/)?.[1]),
        ];
        if (sizes.some((size) => !size) || new Set(sizes).size !== sizes.length) {
          throw new PricingError("Each tier must use a different cake size.");
        }
      }

      const fondantCovering = (selectedByGroupId.get(cakeGroups.fondantCovering.id) ?? [])[0];
      const expectedFondant = `fondant-${tierCount}-${tierCount === 1 ? "tier" : "tiers"}`;
      if (fondantCovering && fondantCovering.choice_key !== expectedFondant) {
        throw new PricingError(
          `Choose fondant covering for exactly ${tierCount} tier${tierCount === 1 ? "" : "s"}.`,
        );
      }

      const fondant = fondantCovering != null;
      const minimum = fondant ? product.fondant_minimum_cents : product.buttercream_minimum_cents;
      if (minimum == null || minimum < 1)
        throw new PricingError("Cake minimums are not configured.");
      if (unitTotal < minimum) {
        throw new PricingError(
          `${product.name} has a ${fondant ? "fondant" : "buttercream"} minimum of $${(minimum / 100).toFixed(2)}. Add a larger size or more design details.`,
        );
      }
    }

    const lineTotal = unitTotal * request.quantity;
    const depositPercent =
      product.payment_rule === "deposit" ? (product.deposit_percent ?? null) : null;
    const dueNow =
      product.payment_rule === "deposit"
        ? depositPercent != null
          ? Math.round((lineTotal * depositPercent) / 100)
          : product.deposit_cents! * request.quantity
        : lineTotal;

    const options = new Map<string, string[]>();
    for (const choice of snapshot) {
      const labels = options.get(choice.group_label) ?? [];
      labels.push(choice.choice_label);
      options.set(choice.group_label, labels);
    }

    return {
      product_id: product.id,
      product_slug: product.slug,
      name: product.name,
      quantity: request.quantity,
      pack_size: product.pack_size,
      pack_unit: product.pack_unit,
      payment_rule: product.payment_rule as "full" | "deposit",
      base_price_cents: base,
      options_total_cents: optionsTotal,
      unit_total_cents: unitTotal,
      line_total_cents: lineTotal,
      line_due_now_cents: dueNow,
      deposit_cents: product.deposit_cents,
      deposit_percent: depositPercent,
      options_snapshot: snapshot,
      options: Object.fromEntries(
        [...options].map(([label, choices]) => [label, choices.join(", ")]),
      ),
      notes: request.notes ?? null,
      lead_time: product.lead_time,
    };
  });
  const { data: revisions, error: revisionError } = await supabase
    .from("products")
    .select("id,updated_at")
    .in("id", productIds);
  if (
    revisionError ||
    revisions?.length !== products?.length ||
    revisions?.some(
      (p) => products?.find((before) => before.id === p.id)?.updated_at !== p.updated_at,
    )
  ) {
    throw new PricingError("Prices changed while calculating your basket. Please try again.");
  }
  return priced;
}

/**
 * Resolves a delivery fee from trusted configuration only. If an authoritative
 * fee cannot be produced the order is refused rather than estimated.
 */
export async function resolveDelivery(
  fulfilment: "pickup" | "delivery",
  postalCodeRaw: string | null | undefined,
): Promise<DeliveryResult> {
  const supabase = await db();
  const { data: settings } = await supabase
    .from("settings")
    .select("delivery_mode, delivery_origin_postal_code, delivery_distance_config")
    .limit(1)
    .maybeSingle();

  const mode = (settings?.delivery_mode ?? "pickup_only") as DeliveryResult["mode"];

  if (fulfilment === "pickup") {
    return { mode, fulfilment, fee_cents: 0, postal_code: null, zone_name: null, detail: null };
  }

  if (mode === "pickup_only") {
    throw new PricingError("Delivery is not available — orders are collected in Etobicoke.");
  }

  const postal = normalisePostalCode(postalCodeRaw ?? "");
  if (postal.length < 3) {
    throw new PricingError("Enter the postal code so the delivery fee can be worked out.");
  }

  if (mode === "fixed_zones") {
    const { data: zones } = await supabase
      .from("delivery_zones")
      .select("name, postal_prefixes, fee_cents")
      .eq("active", true)
      .order("sort_order");
    const zone = (zones ?? []).find((z) =>
      (z.postal_prefixes ?? []).some((prefix) => postal.startsWith(normalisePostalCode(prefix))),
    );
    if (!zone) {
      throw new PricingError("We do not deliver to that postal code yet. Please choose pickup.");
    }
    return {
      mode,
      fulfilment,
      fee_cents: zone.fee_cents,
      postal_code: postal,
      zone_name: zone.name,
      detail: `${zone.name} zone rate`,
    };
  }

  // Distance mode: the routing service is the only trusted source of a fee.
  const origin = settings?.delivery_origin_postal_code;
  const config = settings?.delivery_distance_config as {
    bands?: { max_km: number; fee_cents: number }[];
  } | null;
  const bands = [...(config?.bands ?? [])].sort((a, b) => a.max_km - b.max_km);
  if (!origin || bands.length === 0) {
    throw new PricingError("Delivery pricing is not configured yet. Please choose pickup.");
  }

  const km = await drivingDistanceKm(origin, postal);
  const band = bands.find((b) => km <= b.max_km);
  if (!band) {
    throw new PricingError("That address is outside our delivery range. Please choose pickup.");
  }
  return {
    mode,
    fulfilment,
    fee_cents: band.fee_cents,
    postal_code: postal,
    zone_name: null,
    detail: `${km.toFixed(1)} km from the bakery`,
  };
}

async function drivingDistanceKm(originPostal: string, destinationPostal: string): Promise<number> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!mapsKey) {
    throw new PricingError("Delivery pricing is unavailable right now. Please choose pickup.");
  }

  // On Lovable the Google Maps key is used through the connector gateway. On any
  // other host (Vercel, Netlify, a VPS) the same key calls Google directly.
  const viaGateway = Boolean(lovableKey);
  const url = viaGateway
    ? "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes"
    : "https://routes.googleapis.com/directions/v2:computeRoutes";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-FieldMask": "routes.distanceMeters",
  };
  if (viaGateway) {
    headers["Authorization"] = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = mapsKey;
  } else {
    headers["X-Goog-Api-Key"] = mapsKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      origin: { address: `${originPostal}, Canada` },
      destination: { address: `${destinationPostal}, Canada` },
      travelMode: "DRIVE",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Routes request failed [${response.status}]: ${body}`);
    throw new PricingError("We could not work out a delivery fee. Please choose pickup.");
  }

  const json = (await response.json()) as { routes?: { distanceMeters?: number }[] };
  const meters = json.routes?.[0]?.distanceMeters;
  if (!meters) {
    throw new PricingError("We could not work out a delivery fee. Please choose pickup.");
  }
  return meters / 1000;
}

/** Prices a whole basket including delivery. This is what checkout renders. */
export async function priceCart(
  requests: LineRequest[],
  fulfilment: "pickup" | "delivery",
  postalCode: string | null | undefined,
): Promise<PricedCart> {
  const lines = await priceLines(requests);
  const delivery = await resolveDelivery(fulfilment, postalCode);

  const subtotal = lines.reduce((n, l) => n + l.line_total_cents, 0);
  const total = subtotal + delivery.fee_cents;
  const dueNow = lines.reduce((n, l) => n + l.line_due_now_cents, 0) + delivery.fee_cents;

  return {
    lines,
    subtotal_cents: subtotal,
    delivery,
    total_cents: total,
    due_now_cents: dueNow,
    balance_cents: Math.max(0, total - dueNow),
    requires_deposit: lines.some((l) => l.payment_rule === "deposit"),
  };
}
