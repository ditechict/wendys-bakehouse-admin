import { CatalogRouteError } from "@/components/site/CatalogNotice";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CtaBand, PageHeader, Section } from "@/components/site/Bits";
import { isCakeDesignProduct } from "@/lib/cake-designs";
import {
  catalogQueryOptions,
  formatMoney,
  priceLabel,
  packLabel,
  type ShopProduct,
} from "@/lib/shop";

const TITLE = "Price List & Lead Times — Wendy's Bakehouse, Toronto";
const DESC =
  "Real CAD prices for celebration cakes and cupcakes in Toronto, with lead times and pickup terms in Etobicoke.";

export const Route = createFileRoute("/pricing")({
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
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  errorComponent: CatalogRouteError,
  notFoundComponent: () => (
    <Section>
      <p className="text-muted-foreground">That page does not exist.</p>
    </Section>
  ),
  component: PricingPage,
});

/** Upgrades that genuinely change the price, shown so the total is never a surprise. */
function upgrades(product: ShopProduct) {
  if (isCakeDesignProduct(product.id, product.category_id)) return [];
  return product.options.flatMap((group) =>
    group.choices
      .filter((choice) => choice.price_delta_cents !== 0)
      .map((choice) => ({
        label: `${product.name} — ${choice.label}`,
        delta: choice.price_delta_cents,
      })),
  );
}

function PricingPage() {
  const { products, categories } = useSuspenseQuery(catalogQueryOptions).data;

  const cake = products.find((p) => p.slug === "tiered-celebration-cake");
  const listed = products
    .filter((p) => p.available && p.price_cents != null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const grouped = categories
    .map((category) => ({
      category,
      items: listed.filter((p) => p.category_id === category.id),
    }))
    .filter((g) => g.items.length > 0);

  const uncategorised = listed.filter((p) => !p.category_id);
  if (uncategorised.length > 0) {
    grouped.push({
      category: { ...categories[0]!, id: "other", name: "More from the bakehouse" },
      items: uncategorised,
    });
  }

  const allUpgrades = listed.flatMap(upgrades);
  const leadTimes = [...new Set(listed.map((p) => p.lead_time).filter(Boolean))];

  return (
    <>
      <PageHeader
        eyebrow="Price list"
        title="What everything costs, in plain numbers."
        lead="Every price here is the real CAD price you pay. Sizes and finishes that cost more are listed with exactly how much they add."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            {grouped.map(({ category, items }) => (
              <section key={category.id} className="mb-12">
                <h2 className="text-3xl">{category.name}</h2>
                <dl className="mt-6 divide-y divide-border border-y border-border">
                  {items.map((p) => {
                    const pack = packLabel(p);
                    return (
                      <div key={p.slug} className="flex items-baseline justify-between gap-6 py-4">
                        <dt>
                          <Link
                            to="/menu/$slug"
                            params={{ slug: p.slug }}
                            className="font-medium hover:text-primary"
                          >
                            {p.name}
                          </Link>
                          {pack && (
                            <span className="block text-sm text-muted-foreground">{pack}</span>
                          )}
                          {p.payment_rule === "deposit" && (
                            <span className="block text-sm text-muted-foreground">
                              {p.deposit_percent != null
                                ? `${p.deposit_percent}% deposit holds your date`
                                : `${formatMoney(p.deposit_cents)} deposit holds your date`}
                            </span>
                          )}
                        </dt>
                        <dd className="shrink-0 text-right">
                          <span className="font-display text-lg text-gold">{priceLabel(p)}</span>
                          {p.lead_time && (
                            <span className="block text-xs text-muted-foreground">
                              {p.lead_time} notice
                            </span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}

            {allUpgrades.length > 0 && (
              <>
                <h2 className="text-3xl">Sizes and finishes that add to the price</h2>
                <dl className="mt-6 divide-y divide-border border-y border-border">
                  {allUpgrades.map((u) => (
                    <div key={u.label} className="flex items-baseline justify-between gap-6 py-4">
                      <dt className="text-sm md:text-base">{u.label}</dt>
                      <dd className="shrink-0 font-display text-lg text-gold">
                        {u.delta > 0 ? "+" : "−"}
                        {formatMoney(Math.abs(u.delta))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {leadTimes.length > 0 && (
              <>
                <h2 className="mt-14 text-3xl">Lead times</h2>
                <ul className="mt-6 flex flex-wrap gap-3">
                  {leadTimes.map((lead) => (
                    <li
                      key={lead}
                      className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground"
                    >
                      {lead}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside className="md:col-span-5">
            <div className="rounded-lg border border-border bg-secondary p-6">
              <h2 className="font-display text-2xl">How the money works</h2>
              <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Pay in full at checkout</strong> for cupcakes.
                </li>
                <li>
                  <strong className="text-foreground">Custom cakes take the deposit shown</strong>{" "}
                  to hold the date, with the balance due before pickup or delivery.
                </li>
                <li>
                  <strong className="text-foreground">Pickup is free</strong> in Etobicoke. Delivery
                  is $30 in Etobicoke or $35 across the configured GTA postal zones, shown at
                  checkout before you pay.
                </li>
                <li>
                  <strong className="text-foreground">
                    Custom cake minimums are {formatMoney(cake?.buttercream_minimum_cents)}
                  </strong>{" "}
                  for buttercream and {formatMoney(cake?.fondant_minimum_cents)} for fondant. Your
                  configured total must meet the relevant minimum.
                </li>
                <li>
                  <strong className="text-foreground">Each tier is a full three-layer cake.</strong>{" "}
                  Fondant figures and sculpted models are not offered.
                </li>
              </ul>
              <Link
                to="/menu"
                search={{}}
                className="mt-7 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Start your order
              </Link>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
