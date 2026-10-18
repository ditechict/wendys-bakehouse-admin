import { useShopContact } from "@/lib/use-shop-contact";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AtSign,
  CalendarClock,
  Facebook,
  Instagram,
  Landmark,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
} from "lucide-react";
import { BUSINESS, FAQS } from "@/data/catalog";
import { CtaBand, PageHeader, Section } from "@/components/site/Bits";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "Ordering & Pickup Policies - Wendy's Bakehouse";
const DESC =
  "Payment, pickup, delivery and allergen policies for Wendy's Bakehouse in Etobicoke, plus contact details and frequently asked questions.";

export const Route = createFileRoute("/policies")({
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
  component: PoliciesPage,
});

const SOCIALS = [
  { href: BUSINESS.instagram, label: "Instagram", handle: "@wendys.bakehouse", Icon: Instagram },
  { href: BUSINESS.tiktok, label: "TikTok", handle: "@wendys.bakehouse", Icon: Music2 },
  { href: BUSINESS.threads, label: "Threads", handle: "@wendys.bakehouse", Icon: AtSign },
  { href: BUSINESS.facebook, label: "Facebook", handle: "Wendy's Bakehouse", Icon: Facebook },
];

function PoliciesPage() {
  const contact = useShopContact();
  return (
    <>
      <PageHeader
        eyebrow="Policies"
        title="Clear terms before your order goes into the oven."
        lead="How deposits, balances, pickup, delivery and food-safety questions are handled at Wendy's Bakehouse."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-12">
          <div className="space-y-10 md:col-span-7">
            <section>
              <div className="flex items-start gap-3">
                <Landmark className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <h2 className="text-3xl">Payment and booking</h2>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <li>Everyday bakes are paid in full when the order is placed.</li>
                    <li>
                      Custom cakes require the deposit shown when ordering. The remaining balance is
                      due before pickup or delivery.
                    </li>
                    <li>
                      A date is held only after the required payment is confirmed. Submitting an
                      order without payment does not reserve a slot.
                    </li>
                    <li>
                      Card payments are confirmed automatically. Bank transfers and WhatsApp orders
                      remain unpaid until Wendy verifies the payment.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-10">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <h2 className="text-3xl">Changes and cancellations</h2>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <li>Payments are non-refundable once confirmed.</li>
                    <li>
                      Size, design, flavour and add-on changes need at least one week&rsquo;s notice
                      before the event date.
                    </li>
                    <li>
                      Pickup or delivery time changes need at least 12 hours&rsquo; notice and
                      remain subject to availability.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-10">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <h2 className="text-3xl">Pickup and delivery</h2>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <li>
                      Pickup is in Etobicoke, Toronto. The exact address and pickup window are
                      shared after the order is confirmed.
                    </li>
                    <li>
                      Delivery starts at $30 within the configured Etobicoke postal zones and $35
                      across the configured Greater Toronto Area postal zones; the exact fee is
                      confirmed at checkout from the destination postal code.
                    </li>
                    <li>
                      Enter the destination postal code at checkout. If the address is outside the
                      available zones, choose pickup instead.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-10">
              <h2 className="text-3xl">Frequently asked questions</h2>
              <Accordion type="single" collapsible className="mt-4">
                {FAQS.map((faq) => (
                  <AccordionItem key={faq.q} value={faq.q}>
                    <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                    <AccordionContent>{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>

          <aside className="md:col-span-5">
            <div className="rounded-[1.5rem] border border-border bg-secondary p-6 md:sticky md:top-28">
              <h2 className="text-3xl">Contact Wendy</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Questions about a date or an existing order are usually answered within 24 hours.
              </p>
              <div className="mt-6 grid gap-3">
                <a
                  href={`tel:+${contact.phoneE164}`}
                  className="flex items-center gap-3 rounded-sm border border-border bg-card p-4 text-sm font-semibold"
                >
                  <Phone className="h-4 w-4 text-gold" aria-hidden="true" />
                  {contact.phoneDisplay}
                </a>
                <a
                  href={contact.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 rounded-sm border border-border bg-card p-4 text-sm font-semibold"
                >
                  <MessageCircle className="h-4 w-4 text-gold" aria-hidden="true" />
                  Chat with Wendy
                </a>
              </div>

              <h3 className="eyebrow mt-8 text-muted-foreground">Follow the bakes</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                {SOCIALS.map(({ href, label, handle, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-3 rounded-sm border border-border bg-card p-3 text-sm"
                    >
                      <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                      <span>
                        <span className="block font-semibold">{label}</span>
                        <span className="text-xs text-muted-foreground">{handle}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <Link
                to="/menu"
                search={{}}
                className="mt-7 block rounded-sm bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
              >
                Start an order
              </Link>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
