import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Tailwind aspect utility, e.g. "aspect-square" or "aspect-[4/3]". */
  ratio?: string;
  rounded?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  background?: "white" | "secondary";
};

/** Image inside a fixed-ratio box with a skeleton while it loads. */
export function SmartImage({
  src,
  alt,
  className = "",
  ratio = "aspect-[4/3]",
  rounded = "rounded-[1.15rem]",
  priority = false,
  fit = "cover",
  background = "secondary",
}: Props) {
  const [loadedSrc, setLoadedSrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");
  const loaded = loadedSrc === src;

  if (!src || failedSrc === src) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center border border-border px-5 text-center",
          background === "white" ? "bg-white" : "bg-secondary",
          ratio,
          rounded,
          className,
        )}
      >
        <div>
          <p className="font-display text-xl">{alt}</p>
          <p className="mt-2 text-sm text-muted-foreground">Photograph coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden", background === "white" ? "bg-white" : "bg-secondary", ratio, rounded, className)}>
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={cn(
          "h-full w-full transition-opacity duration-500",
          fit === "contain" ? "object-contain" : "object-cover",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
