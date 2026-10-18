import { useShopContact } from "@/lib/use-shop-contact";
import { Link } from "@tanstack/react-router";
import { Instagram, Music2, AtSign, Facebook, Phone } from "lucide-react";
import { Lockup } from "./Brand";
import { BUSINESS } from "@/data/catalog";

const SOCIALS = [
  { href: BUSINESS.instagram, label: "Instagram", Icon: Instagram },
  { href: BUSINESS.tiktok, label: "TikTok", Icon: Music2 },
  { href: BUSINESS.threads, label: "Threads", Icon: AtSign },
  { href: BUSINESS.facebook, label: "Facebook", Icon: Facebook },
];

export function SiteFooter() {
  const contact = useShopContact();
  return (
    <footer className="mt-24 bg-cocoa text-cocoa-foreground">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Lockup tone="cream" />
          <p className="mt-5 max-w-sm text-sm text-cocoa-foreground/70">
            {BUSINESS.tagline} Made to order in Etobicoke by a Certified Food Handler — celebration
            cakes and cupcakes.
          </p>
          <a
            href={`tel:+${contact.phoneE164}`}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {contact.phoneDisplay}
          </a>
        </div>

        <div>
          <h2 className="eyebrow text-gold">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm text-cocoa-foreground/80">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/menu">Menu</Link>
            </li>
            <li>
              <Link to="/pricing">Pricing</Link>
            </li>
            <li>
              <Link to="/menu">Start an order</Link>
            </li>
            <li>
              <Link to="/about">Our story</Link>
            </li>
            <li>
              <Link to="/policies">Policies &amp; pickup</Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-gold">Pickup</h2>
          <p className="mt-4 text-sm text-cocoa-foreground/80">
            Etobicoke, Toronto, Ontario. Address shared once your date is confirmed. Delivery is $30
            in Etobicoke or $35 in covered GTA postal zones.
          </p>
          <ul className="mt-5 flex gap-3">
            {SOCIALS.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cocoa-foreground/25 transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-cocoa-foreground/15">
        <p className="mx-auto max-w-[1200px] px-5 py-5 text-xs text-cocoa-foreground/50">
          © {new Date().getFullYear()} Wendy&rsquo;s Bakehouse — Cakes in Toronto. Not affiliated
          with any restaurant chain of a similar name. Baked in a bakery that handles wheat, dairy,
          egg and nuts.
        </p>
      </div>
    </footer>
  );
}
