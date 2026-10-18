import { useShopContact } from "@/lib/use-shop-contact";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, MessageCircle } from "lucide-react";
import { Lockup } from "./Brand";
import { BUSINESS } from "@/data/catalog";
import { CartDrawer } from "@/components/site/CartDrawer";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/menu", label: "Menu", category: undefined },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "Our story" },
] as const;

export function SiteHeader() {
  const contact = useShopContact();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      <div className="border-b border-border/60 bg-background text-foreground">
        <p className="eyebrow mx-auto max-w-[1200px] px-5 py-2 text-center text-[11px] text-muted-foreground">
          Now booking {BUSINESS.bookingMonth} · Pickup in Etobicoke · Certified Food Handler
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3">
          <Lockup />

          <nav aria-label="Main" className="hidden items-center gap-4 lg:flex">
            {NAV.map((item) => (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                {...(item.to === "/menu" ? { search: { category: item.category } } : {})}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary/60 hover:text-primary"
                activeProps={{ className: "bg-secondary text-primary", "aria-current": "page" }}
                activeOptions={{ exact: true, includeSearch: false }}
              >
                {item.label}
              </Link>
            ))}
            <CartDrawer />
            <Link
              to="/menu"
              className="rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start an order
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <CartDrawer />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-site-menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              Menu
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          ref={menuRef}
          id="mobile-site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background px-5 py-4 text-foreground lg:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key !== "Tab") return;
            const controls = menuRef.current?.querySelectorAll<HTMLElement>(
              "a[href],button:not([disabled])",
            );
            if (!controls?.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div onClick={() => setOpen(false)}>
              <Lockup withDescriptor={false} />
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-6 flex flex-col gap-2 border-y border-border py-4">
            {NAV.map((item) => (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                {...(item.to === "/menu" ? { search: { category: item.category } } : {})}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-display text-2xl text-foreground transition-colors hover:bg-secondary/60"
                activeProps={{ className: "bg-secondary text-primary", "aria-current": "page" }}
                activeOptions={{ exact: true, includeSearch: false }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3 pb-4 pt-6">
            <Link
              to="/menu"
              onClick={() => setOpen(false)}
              className="rounded-sm bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              Start an order
            </Link>
            <a
              href={contact.whatsapp}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Chat with Wendy
            </a>
          </div>
        </div>
      )}
    </>
  );
}
