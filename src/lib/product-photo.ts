import { CAKE_DESIGNS } from "./cake-designs";

/** Uploaded photographs only. Bundled synthetic photos and missing-photo fallbacks are excluded. */
export function realPhotoSrc(url: string | null | undefined): string {
  if (!url || /(?:placeholder|\/assets\/|\/__l5e\/|data:|javascript:)/i.test(url)) return "";
  if (url.startsWith("storage:")) {
    const path = url.slice(8);
    const design = CAKE_DESIGNS.find((d) => path === `custom-cakes/designs-20261015/${d.slug}.jpg`);
    if (design) return `/product-photos/${design.slug}.jpg`;
    return path && !path.includes("..") && !/[?#\\]/.test(path)
      ? `/api/public/product-image/${path}`
      : "";
  }
  if (url.startsWith("/api/public/product-image/"))
    return realPhotoSrc(`storage:${url.slice("/api/public/product-image/".length)}`);
  if (CAKE_DESIGNS.some((d) => url === `/product-photos/${d.slug}.jpg`)) return url;
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

