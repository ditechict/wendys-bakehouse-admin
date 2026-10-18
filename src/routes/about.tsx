import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { CUSTOM_CAKE_GALLERY } from "@/lib/custom-cake-contract";
import { imageSrc } from "@/lib/shop";
import { CtaBand, Eyebrow, PageHeader, Section } from "@/components/site/Bits";

const TITLE = "Our story — Celebration Cakes in Toronto";
const DESC =
  "A one-woman Etobicoke bakehouse: Certified Food Handler, made-to-order celebration cakes and cupcakes for pickup.";

export const Route = createFileRoute("/about")({
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
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="One baker, one bakery, made for your celebration."
        lead="Wendy's Bakehouse is a made-to-order bakery in Etobicoke. Not a chain, not a shopfront — one Certified Food Handler baking to a date you have circled on a calendar."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="text-lg leading-relaxed">
              Most orders start the same way: someone has a party in ten days and needs a cake that
              looks like the one in their head. Every cake starts with the occasion, the design and
              the flavours they want to share.
            </p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              This bakehouse focuses on celebration cakes and cupcakes. Everything is
              baked to order for your pickup slot — nothing is made ahead and frozen.
            </p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Buttercream is the house finish; fondant covering is available as a clearly priced
              extra. Sculpted fondant figures and models are not offered. Bookings run by the month
              so that the number of cakes leaving this bakery stays honest.
            </p>

            <div className="mt-10 flex items-start gap-4 rounded-lg border border-border bg-secondary p-6">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-sm">
                <strong className="block font-display text-lg">Certified Food Handler</strong>
                Ontario food handler certification covers safe preparation, storage and temperature
                control. It is why allergen questions get a straight answer rather than a shrug.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:col-span-5">
            <img
              src={imageSrc({ image_url: CUSTOM_CAKE_GALLERY[2]! })}
              alt="Custom celebration cake from Wendy’s Bakehouse"
              loading="lazy"
              className="w-full rounded-[1.5rem] object-cover"
            />
            <img
              src={imageSrc({ image_url: CUSTOM_CAKE_GALLERY[3]! })}
              alt="A celebration cake decorated by Wendy’s Bakehouse"
              loading="lazy"
              className="w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </Section>

      <Section tone="cocoa">
        <Eyebrow>Cakes for every occasion</Eyebrow>
        <h2 className="mt-4 max-w-3xl text-3xl md:text-4xl">
          Every celebration deserves a cake made with care.
        </h2>
        <p className="mt-5 max-w-[64ch] text-cocoa-foreground/75">
          Whether you are ordering a cake for a celebration, a gathering or a gift,
          tell us the occasion so we can plan the
          design and timing with you.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
