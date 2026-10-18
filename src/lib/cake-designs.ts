import { CUSTOM_CAKE_PRODUCT_ID, CUSTOM_CAKE_CATEGORY_ID } from "./cake-identity";
/** Imported design listings share the existing custom-cake configurator and price rules. */
export const CAKE_DESIGNS = [
  {
    id: "c2026101-0001-4000-8000-000000000001",
    slug: "racing-adventure-cake",
    name: "Racing Adventure Cake",
    detail:
      "A blue racing-themed celebration cake with car toppers, flags and track-inspired details.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000002",
    slug: "wild-one-safari-cake",
    name: "Wild One Safari Cake",
    detail:
      "A safari-inspired celebration cake with animal decorations, green leaves and a Wild One topper.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000003",
    slug: "pink-ranger-celebration-cake",
    name: "Pink Ranger Celebration Cake",
    detail:
      "A pink celebration cake with ranger-themed toppers, purple piping and personalised lettering.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000004",
    slug: "black-and-gold-graduation-cake",
    name: "Black & Gold Graduation Cake",
    detail: "An ivory, black and gold graduation design with celebratory academic toppers.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000005",
    slug: "royal-blue-golden-celebration-cake",
    name: "Royal Blue Golden Celebration Cake",
    detail:
      "A royal-blue celebration design with blue flowers, pearl-style details and gold accents.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000006",
    slug: "lilac-butterfly-cake",
    name: "Lilac Butterfly Cake",
    detail:
      "A lilac celebration design with pink butterflies, pearl-style details and a birthday topper.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000007",
    slug: "ivory-and-pink-floral-cake",
    name: "Ivory & Pink Floral Cake",
    detail:
      "An ivory celebration design with pink and cream flowers, gold accents and a birthday topper.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000008",
    slug: "pink-rose-ombre-cake",
    name: "Pink Rose Ombré Cake",
    detail:
      "A pink-to-ivory ombré celebration design with a large rose, round accents and gold details.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000009",
    slug: "monochrome-fan-celebration-cake",
    name: "Monochrome Fan Celebration Cake",
    detail: "An ivory and black celebration design with fan decorations and silver-style accents.",
  },
  {
    id: "c2026101-0001-4000-8000-000000000010",
    slug: "tropical-getaway-cake",
    name: "Tropical Getaway Cake",
    detail:
      "A colourful tropical celebration design with palm trees, flowers and holiday-inspired details.",
  },
] as const;

export function isCakeDesignProduct(id: string, categoryId?: string | null): boolean {
  const normalised = id.toLowerCase();
  if (normalised === CUSTOM_CAKE_PRODUCT_ID) return false;
  return (
    categoryId?.toLowerCase() === CUSTOM_CAKE_CATEGORY_ID ||
    CAKE_DESIGNS.some((design) => design.id === normalised)
  );
}

export function cakeDesignPhoto(slug: string): string {
  return `storage:custom-cakes/designs-20261015/${slug}.jpg`;
}
