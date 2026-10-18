import type { LucideIcon } from "lucide-react";
import { Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageSrc } from "@/lib/shop";
import { CUSTOM_CAKE_GALLERY } from "@/lib/custom-cake-contract";
import { CAKE_DESIGNS } from "@/lib/cake-designs";
import { SmartImage } from "@/components/site/SmartImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const GALLERY_URLS = CUSTOM_CAKE_GALLERY.map((url) => imageSrc({ image_url: url }));
const GALLERY_ALTS = CAKE_DESIGNS.map((design) => design.name);

/**
 * Branded placeholder used anywhere a single cake photo would misrepresent the
 * configurable custom celebration cake.
 */
export function CustomCakeTile({
  label = "Build your own",
  icon: Icon = Cake,
  description = "Choose your size, layers and design details",
  className = "",
  ratio = "aspect-square",
}: {
  label?: string;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  ratio?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.15rem] border border-gold/40 bg-gradient-to-br from-cocoa via-cocoa-blush/50 to-cocoa text-cocoa-foreground",
        ratio,
        className,
      )}
    >
      <Icon className="h-9 w-9 text-gold" aria-hidden="true" />
      <span className="px-3 text-center font-display text-base leading-tight">{label}</span>
      <span className="px-4 text-center text-[11px] text-cocoa-foreground/70">{description}</span>
    </div>
  );
}

/** Compact decorative mark for basket rows where the product name is adjacent. */
export function CustomCakeMark({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[0.9rem] border border-gold/40 bg-gradient-to-br from-cocoa via-cocoa-blush/50 to-cocoa text-gold",
        className,
      )}
    >
      <Cake className="h-7 w-7" />
    </div>
  );
}

/** Three-photo montage for collection cards. */
export function CustomCakeMontage({
  className = "",
  priority = false,
  ratio = "aspect-[4/3]",
}: {
  className?: string;
  priority?: boolean;
  ratio?: string;
}) {
  return (
    <div
      role="img"
      aria-label="Three custom celebration cake designs"
      className={cn("relative w-full overflow-hidden rounded-[1.15rem]", ratio, className)}
    >
      <img
        src={GALLERY_URLS[0]}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className="absolute left-0 top-0 h-[68%] w-[58%] rounded-[0.9rem] border border-gold/30 object-cover object-top shadow-lg"
      />
      <img
        src={GALLERY_URLS[1]}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className="absolute right-0 top-[12%] h-[68%] w-[50%] rounded-[0.9rem] border border-gold/30 object-cover object-top shadow-lg"
      />
      <img
        src={GALLERY_URLS[2]}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className="absolute bottom-0 left-[16%] h-[68%] w-[50%] rounded-[0.9rem] border border-gold/30 object-cover object-top shadow-lg"
      />
    </div>
  );
}

/** Carousel of past celebration cakes for the custom cake product page. */
export function CakeGallery({
  className = "",
  images,
}: {
  className?: string;
  images?: { src: string; alt: string }[];
}) {
  const photos =
    images === undefined
      ? GALLERY_URLS.map((src, i) => ({ src, alt: GALLERY_ALTS[i] ?? "Custom celebration cake" }))
      : images.filter(
          (image, index, all) =>
            image.src && all.findIndex((other) => other.src === image.src) === index,
        );
  return (
    <div className={cn("relative", className)}>
      <span className="absolute left-3 top-3 z-10 rounded-sm bg-cocoa px-3 py-1.5 text-xs font-semibold text-cocoa-foreground">
        Build your own
      </span>
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {photos.map((photo, index) => (
            <CarouselItem key={photo.src}>
              <SmartImage
                background="white"
                src={photo.src}
                alt={photo.alt}
                ratio="aspect-[586/744]"
                rounded="rounded-[1.75rem]"
                priority={index === 0}
                fit="contain"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3" />
        <CarouselNext className="right-3" />
      </Carousel>
      <p className="mt-3 text-xs text-muted-foreground">
        Past celebration cakes as examples - every cake is built to order, so yours will be its own
        design.
      </p>
    </div>
  );
}
