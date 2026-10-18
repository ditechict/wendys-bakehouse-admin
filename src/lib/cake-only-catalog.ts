/** Public storefront range. Historical non-cake records remain in the database. */
export const CAKE_COLLECTION_SLUGS = ["celebration-cakes", "cupcakes"];
export function isCakeCollection(slug: string): boolean {
  return CAKE_COLLECTION_SLUGS.includes(slug);
}
