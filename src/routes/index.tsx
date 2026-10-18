import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { BUSINESS } from "@/data/catalog";
import { CustomCakeMontage } from "@/components/site/CakeArtwork";
import { CatalogNotice } from "@/components/site/CatalogNotice";
import {
  CUSTOM_CAKE_PRODUCT_SLUG,
  CUSTOM_CAKE_COVER_IMAGE,
  isCustomCakeCategory,
} from "@/lib/custom-cake-contract";
import { TestimonialSlider } from "@/components/site/TestimonialSlider";
import {
  CtaBand,
  Eyebrow,
  ProductCard,
  ProductCardSkeleton,
  Section,
} from "@/components/site/Bits";
import { SmartImage } from "@/components/site/SmartImage";
import { catalogQueryOptions, categoryImage, imageSrc } from "@/lib/shop";

const TITLE = "Wendy's Bakehouse — Custom Cakes in Toronto & Etobicoke";
const DESC =
  "Made-to-order celebration cakes in Toronto. Custom cakes and cupcakes for pickup in Etobicoke.";

export const Route = createFileRoute("/")({
  // A catalogue outage must not replace the original hero with an error page.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(catalogQueryOptions).catch(() => undefined),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    n: "01",
    t: "Tell me the details",
    d: "Flavour, size, date and the look you want — through the order form or WhatsApp.",
  },
  {
    n: "02",
    t: "I confirm your date",
    d: "You see the price as you order, and I confirm your pickup window.",
  },
  {
    n: "03",
    t: "Pay to hold the slot",
    d: "Everyday items are paid in full; custom cakes require the deposit shown when ordering.",
  },
  {
    n: "04",
    t: "Collect or arrange delivery",
    d: "Pickup is in Etobicoke, with fixed delivery rates for covered postal zones.",
  },
];

function Index() {
  const { data, isPending, isError, isFetching, refetch } = useQuery(catalogQueryOptions);
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const signature = products.slice(0, 4);

  return (
    <>
      <section className="relative bg-background text-foreground">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:min-h-[640px] md:grid-cols-12 md:items-center md:py-20">
          <div className="relative -mx-5 -mt-14 md:absolute md:inset-y-0 md:right-0 md:mt-0 md:mx-0 md:w-[52%]">
            <CustomCakeMontage
              priority
              ratio="aspect-[4/3] md:aspect-auto md:h-full"
              className="hero-cake-montage"
            />
          </div>
          <div className="relative z-10 md:order-1 md:col-span-6 md:pr-10">
            <p className="eyebrow text-primary">Now booking {BUSINESS.bookingMonth}</p>
            <h1 className="mt-5 text-[2.5rem] leading-[1.03] md:text-6xl">
              Made-to-order <span className="text-primary">celebration cakes</span> in Toronto.
            </h1>
            <p className="mt-6 max-w-[56ch] text-lg text-muted-foreground">
              Build your custom cake from a clear size-and-layer menu, then add only the design
              details you want. Every choice is priced upfront by a Certified Food Handler baking to
              order in Etobicoke.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="rounded-sm bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse cakes
              </Link>
              <Link
                to="/menu/$slug"
                params={{ slug: CUSTOM_CAKE_PRODUCT_SLUG }}
                className="rounded-sm border border-border px-6 py-3.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
              >
                Customize your cake
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-bronze" aria-hidden="true" /> Certified Food
                Handler
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-bronze" aria-hidden="true" /> Pickup in Etobicoke
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-bronze" aria-hidden="true" /> Baked to order
              </li>
            </ul>
          </div>
        </div>
      </section>

      <Section>
        <Eyebrow>Shop by collection</Eyebrow>
        <h2 className="mt-4 text-3xl md:text-4xl">Celebration cakes and cupcakes.</h2>
        {(isError || (!isPending && categories.length === 0)) && (
          <CatalogNotice
            retry={() => void refetch()}
            busy={isFetching}
            cached={categories.length > 0}
            empty={!isError}
          />
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2" aria-busy={isPending}>
          {isPending && Array.from({ length: 2 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/menu"
              search={{ category: c.slug }}
              className="group overflow-hidden rounded-[1.5rem] border border-border bg-card p-2"
            >
              <SmartImage
                src={
                  isCustomCakeCategory(c.id) || c.slug === "celebration-cakes"
                    ? imageSrc(c) || CUSTOM_CAKE_COVER_IMAGE
                    : categoryImage(c, products)
                }
                alt={
                  isCustomCakeCategory(c.id) || c.slug === "celebration-cakes"
                    ? "Custom ivory cake with pink flowers and gold details"
                    : c.name
                }
                ratio="aspect-[4/3]"
                fit="contain"
                background="white"
                className="transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="p-5">
                <h3 className="font-display text-xl group-hover:text-primary">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <Eyebrow>How ordering works</Eyebrow>
        <h2 className="mt-4 text-3xl md:text-4xl">Four steps, one conversation.</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t-2 border-gold/50 pt-5">
              <span className="font-display text-3xl text-gold">{s.n}</span>
              <h3 className="mt-3 font-display text-xl">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow>Real feedback, real love</Eyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl">What customers say.</h2>
            <p className="mt-5 text-muted-foreground">
              Real messages from customers after their cakes arrived. Use the arrows to read through
              the latest feedback.
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" /> Rich flavour
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" /> Just-right
                sweetness
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" aria-hidden="true" /> Ready on your date
              </li>
            </ul>
          </div>
          <div className="md:col-span-7">
            <TestimonialSlider />
          </div>
        </div>
      </Section>

      <Section tone="sand">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Signature bakes</Eyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl">Featured cakes</h2>
          </div>
          <Link to="/menu" className="border-b-2 border-gold pb-1 text-sm font-semibold">
            View the whole menu
          </Link>
        </div>
        {(isError || (!isPending && products.length === 0)) && (
          <CatalogNotice
            retry={() => void refetch()}
            busy={isFetching}
            cached={products.length > 0}
            empty={!isError}
          />
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy={isPending}>
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : signature.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </Section>

      <Section tone="cocoa">
        <Eyebrow>Why order here</Eyebrow>
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <div>
            <ShieldCheck className="h-6 w-6 text-gold" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">Certified and careful</h3>
            <p className="mt-3 text-cocoa-foreground/70">
              Ontario Certified Food Handler. Everything is baked to order for your date — nothing
              is pulled out of a freezer.
            </p>
          </div>
          <div>
            <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">Your cake, itemised</h3>
            <p className="mt-3 text-cocoa-foreground/70">
              Start with one of nine cake bases, then see each topper, colour, finish and tier added
              to the total before checkout.
            </p>
          </div>
          <div>
            <Clock className="h-6 w-6 text-gold" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">Dates you can trust</h3>
            <p className="mt-3 text-cocoa-foreground/70">
              Bookings run by the month with a fixed pickup window, so your slot is real and your
              cake is ready when you arrive.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
