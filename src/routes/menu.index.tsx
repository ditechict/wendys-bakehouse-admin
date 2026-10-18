import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CtaBand,
  PageHeader,
  ProductCard,
  ProductCardSkeleton,
  Section,
} from "@/components/site/Bits";
import { CatalogNotice } from "@/components/site/CatalogNotice";
import { catalogQueryOptions } from "@/lib/shop";

const TITLE = "Cakes & treats — Wendy's Bakehouse, Toronto";
const DESC =
  "Browse made-to-order celebration cakes and cupcakes. Prices in CAD, pickup in Etobicoke, Toronto.";

type Search = { category?: string };

export const Route = createFileRoute("/menu/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const c = search["category"];
    return typeof c === "string" && c.length > 0 && c.length < 80 ? { category: c } : {};
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions).catch(() => undefined),
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
  component: MenuPage,
});

function MenuPage() {
  const { category } = Route.useSearch();
  const { data, isPending, isError, isFetching, refetch } = useQuery(catalogQueryOptions);

  const categories = data?.categories ?? [];
  const active = categories.find((c) => c.slug === category);
  const items = (data?.products ?? []).filter((p) => !active || p.category_id === active.id);

  return (
    <>
      <PageHeader
        eyebrow="Cakes & treats"
        title="The whole menu, with the prices written down."
        lead="Custom celebration cakes and cupcakes. Every price is written down — choose the size and finish and your total is worked out for you."
      />

      <Section>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/menu"
            search={{}}
            className={`rounded-sm border px-4 py-2 text-sm font-medium ${
              category ? "border-input" : "border-primary bg-primary text-primary-foreground"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/menu"
              search={{ category: c.slug }}
              className={`rounded-sm border px-4 py-2 text-sm font-medium ${
                category === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input"
              }`}
            >
              {c.name}
            </Link>
          ))}
          {!isPending && (
            <span className="ml-auto text-sm text-muted-foreground">{items.length} items</span>
          )}
        </div>

        {isError && <CatalogNotice retry={() => void refetch()} busy={isFetching} cached={!!data} />}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isPending
            ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : items.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>

        {!isPending && !isError && items.length === 0 && (
          <p className="mt-10 text-sm text-muted-foreground">
            Nothing in this collection yet — check back soon.
          </p>
        )}

        <p className="mt-10 max-w-[70ch] text-sm text-muted-foreground">
          Prices shown in CAD. Custom cake sizes, tiers and design extras are priced on the product
          page. Fondant figures and sculpted models are not offered.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
