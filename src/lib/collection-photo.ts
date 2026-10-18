import { realPhotoSrc } from "./product-photo";

type PhotoReference = { image_url?: string | null };

/** An obsolete image key must never suppress a usable uploaded photograph. */
export function collectionPhoto(
  category: PhotoReference & { id: string },
  products: readonly (PhotoReference & { category_id: string | null; available: boolean })[],
): string {
  const explicit = realPhotoSrc(category.image_url);
  if (explicit) return explicit;
  for (const product of products) {
    if (!product.available || product.category_id !== category.id) continue;
    const photo = realPhotoSrc(product.image_url);
    if (photo) return photo;
  }
  return "";
}
