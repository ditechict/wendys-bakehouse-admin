import { useShopContact } from "@/lib/use-shop-contact";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { imageSrc, type ShopProduct } from "@/lib/shop";
import { SmartImage } from "@/components/site/SmartImage";
import { CUSTOM_CAKE_COVER_IMAGE, isCustomCakeProduct } from "@/lib/custom-cake-contract";
import { Skeleton } from "@/components/ui/skeleton";

export function Section({
  children,
  className = "",
  tone = "cream",
}: {
  children: ReactNode;
  className?: string;
  tone?: "cream" | "sand" | "cocoa";
}) {
  const bg =
    tone === "cocoa" ? "bg-cocoa text-cocoa-foreground" : tone === "sand" ? "bg-secondary" : "";
  return (
    <section className={`${bg} ${className}`}>
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-24">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-gold">{children}</p>;
}

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="bg-cocoa text-cocoa-foreground">
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">{title}</h1>
        {lead && (
          <p className="mt-5 max-w-[62ch] text-base text-cocoa-foreground/75 md:text-lg">{lead}</p>
        )}
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_10px_30px_-18px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
      <Link
        to="/menu/$slug"
        params={{ slug: product.slug }}
        className="block overflow-hidden rounded-[1.5rem] bg-white p-2"
        tabIndex={-1}
        aria-hidden="true"
      >
        <SmartImage
          src={
            isCustomCakeProduct(product.id)
              ? imageSrc(product) || CUSTOM_CAKE_COVER_IMAGE
              : imageSrc(product)
          }
          alt={
            isCustomCakeProduct(product.id)
              ? "Example of a custom celebration cake by Wendy’s Bakehouse"
              : product.name
          }
          background="white"
          ratio="aspect-square"
          fit="contain"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl">
          <Link to="/menu/$slug" params={{ slug: product.slug }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{product.short}</p>
        <p className="eyebrow mt-4 text-[11px] text-muted-foreground">{product.lead_time}</p>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card">
      <div className="p-2">
        <Skeleton className="aspect-square w-full rounded-[1.15rem]" />
      </div>
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
export function CtaBand() {
  const contact = useShopContact();
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl">Tell me what you&rsquo;re celebrating.</h2>
          <p className="mt-3 max-w-[52ch] text-primary-foreground/80">
            Every price is written down, your total is worked out at checkout, and pickup is in
            Etobicoke. No guessing at prices.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            to="/menu"
            className="rounded-sm bg-background px-5 py-3 text-sm font-semibold text-foreground"
          >
            Start an order
          </Link>
          <a
            href={contact.whatsapp}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-sm border border-primary-foreground/40 px-5 py-3 text-sm font-semibold"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Chat with Wendy
          </a>
        </div>
      </div>
    </section>
  );
}
