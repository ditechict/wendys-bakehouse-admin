import { Link } from "@tanstack/react-router";

export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/70 font-display text-sm tracking-wide text-gold ${className}`}
    >
      WB
    </span>
  );
}

export function Lockup({
  tone = "ink",
  withDescriptor = true,
}: {
  tone?: "ink" | "cream";
  withDescriptor?: boolean;
}) {
  const descTone = tone === "cream" ? "text-cocoa-foreground/60" : "text-muted-foreground";
  return (
    <Link
      to="/"
      className={`group inline-flex shrink-0 flex-col items-center leading-none ${tone === "cream" ? "bg-transparent" : "bg-background"}`}
      aria-label="Wendy's Bakehouse — home"
    >
      <img
        src="/brand/wendys-wb-transparent.png"
        alt="Wendy’s Bakehouse"
        width={1536}
        height={1024}
        decoding="async"
        className={`h-20 w-[120px] object-contain sm:h-24 sm:w-36 ${tone === "cream" ? "brightness-0 invert" : ""}`}
      />
      {withDescriptor && (
        <span className={`eyebrow text-[9px] ${descTone}`}>Custom cakes · Toronto</span>
      )}
    </Link>
  );
}
