import { CAKE_DESIGNS, cakeDesignPhoto } from "./cake-designs";

import { CUSTOM_CAKE_PRODUCT_ID, CUSTOM_CAKE_CATEGORY_ID } from "./cake-identity";
export { CUSTOM_CAKE_PRODUCT_ID, CUSTOM_CAKE_CATEGORY_ID } from "./cake-identity";
export const CUSTOM_CAKE_COVER_IMAGE = "/product-photos/ivory-and-pink-floral-cake.jpg";
export const CUSTOM_CAKE_PRODUCT_SLUG = "tiered-celebration-cake";

export const CUSTOM_CAKE_DESIGN_GROUP_ID = "aab61c6f-909a-416c-b9b3-40647ff36d5f";

/**
 * Example celebration-cake photos shown in the "Build your own" gallery.
 * Stored in the private `product-images` bucket and served through the app's
 * own image endpoint, so they never reference a host-specific CDN.
 */
export const CUSTOM_CAKE_GALLERY = CAKE_DESIGNS.map((design) => cakeDesignPhoto(design.slug));

export const CUSTOM_CAKE_RULE_GROUPS = {
  sizeLayers: {
    id: "30594a40-1fd1-4cca-8f80-280c9d975ec7",
    key: "size-layers",
    required: true,
    allowMultiple: false,
  },
  extraTiers: {
    id: "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510",
    key: "extra-tiers",
    required: false,
    allowMultiple: true,
  },
  fondantCovering: {
    id: "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d511",
    key: "fondant-covering",
    required: false,
    allowMultiple: false,
  },
  tieringFee: {
    id: "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d512",
    key: "tiering-fee",
    required: false,
    allowMultiple: false,
  },
} as const;

export type CustomCakeRuleGroup =
  (typeof CUSTOM_CAKE_RULE_GROUPS)[keyof typeof CUSTOM_CAKE_RULE_GROUPS];

/** UUIDs are case-insensitive in Postgres; normalize before comparing. */
function normUuid(id: string): string {
  return id.toLowerCase();
}

export function customCakeRuleGroup(id: string): CustomCakeRuleGroup | undefined {
  const normalised = normUuid(id);
  return Object.values(CUSTOM_CAKE_RULE_GROUPS).find((group) => group.id === normalised);
}

export function isCustomCakeRuleGroup(id: string): boolean {
  return customCakeRuleGroup(id) != null;
}

export function isCustomCakeOptionGroup(id: string): boolean {
  return normUuid(id) === CUSTOM_CAKE_DESIGN_GROUP_ID || isCustomCakeRuleGroup(id);
}

export function isCustomCakeProduct(id: string): boolean {
  return normUuid(id) === CUSTOM_CAKE_PRODUCT_ID;
}

export function isCustomCakeCartItem(item: { product_id?: string; slug: string }): boolean {
  return isCustomCakeProduct(item.product_id ?? "") || item.slug === CUSTOM_CAKE_PRODUCT_SLUG;
}

export function isCustomCakeCategory(id: string): boolean {
  return normUuid(id) === CUSTOM_CAKE_CATEGORY_ID;
}
