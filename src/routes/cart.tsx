import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { PageHeader, Section } from "@/components/site/Bits";
import { useCart } from "@/lib/cart";
import { formatMoney, imageSrc } from "@/lib/shop";
import { CustomCakeMark } from "@/components/site/CakeArtwork";
import { isCustomCakeCartItem } from "@/lib/custom-cake-contract";

const TITLE = "Your basket — Wendy's Bakehouse, Cakes in Toronto";
const DESC =
  "Review your cakes and cupcakes before checkout. Pickup in Etobicoke, Toronto.";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, remove, setQuantity, quote, isPricing, pricingError } = useCart();

  return (
    <>
      <PageHeader
        eyebrow="Basket"
        title="Everything you've picked so far."
        lead="Everyday bakes are paid in full. Custom cakes take a percentage deposit to hold the date, with the balance due before pickup or delivery."
      />

      <Section>
        {items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-border bg-card p-10 text-center">
            <p className="font-display text-2xl">Your basket is empty.</p>
            <Link
              to="/menu"
              search={{}}
              className="mt-6 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Browse the menu
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-12">
            <ul className="space-y-5 md:col-span-8">
              {items.map((item, i) => {
                const line = quote?.lines[i];
                return (
                  <li
                    key={`${item.slug}-${i}`}
                    className="flex gap-4 rounded-[1.5rem] border border-border bg-card p-4"
                  >
                    {isCustomCakeCartItem(item) ? (
                      <CustomCakeMark className="h-24 w-24" />
                    ) : (
                      <img
                        src={imageSrc(item)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = imageSrc({ image_key: item.image_key ?? null });
                        }}
                        className="h-24 w-24 shrink-0 rounded-[1.15rem] object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h2 className="font-display text-lg">{item.name}</h2>
                      {Object.entries(item.options).length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {Object.entries(item.options)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center rounded-sm border border-input">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(i, item.quantity - 1)}
                            className="p-2"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(i, item.quantity + 1)}
                            className="p-2"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg text-gold">
                        {formatMoney(line?.line_total_cents)}
                      </p>
                      {line?.payment_rule === "deposit" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {line.deposit_percent != null
                            ? `${line.deposit_percent}% deposit: `
                            : "Deposit: "}
                          {formatMoney(line.line_due_now_cents)} due now
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="md:col-span-4">
              <div className="rounded-[1.5rem] border border-border bg-secondary p-6">
                <h2 className="eyebrow text-muted-foreground">Summary</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt>Order total</dt>
                    <dd className="font-display text-lg">{formatMoney(quote?.total_cents)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>Due now</dt>
                    <dd className="font-display text-lg">{formatMoney(quote?.due_now_cents)}</dd>
                  </div>
                  {(quote?.balance_cents ?? 0) > 0 && (
                    <div className="text-muted-foreground">
                      Balance of {formatMoney(quote?.balance_cents)} due before pickup or delivery.
                    </div>
                  )}
                </dl>
                {isPricing && (
                  <p className="mt-3 text-xs text-muted-foreground">Updating total...</p>
                )}
                {pricingError && <p className="mt-3 text-xs text-destructive">{pricingError}</p>}
                {quote ? (
                  <Link
                    to="/checkout"
                    className="mt-6 block rounded-sm bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Continue to checkout
                  </Link>
                ) : (
                  <span className="mt-6 block rounded-sm bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground opacity-60">
                    Confirming total
                  </span>
                )}
                <Link
                  to="/menu"
                  search={{}}
                  className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary"
                >
                  Keep browsing
                </Link>
              </div>
            </aside>
          </div>
        )}
      </Section>
    </>
  );
}
