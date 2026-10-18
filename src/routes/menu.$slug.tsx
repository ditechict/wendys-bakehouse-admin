import { useShopContact } from "@/lib/use-shop-contact";
import { CatalogRouteError } from "@/components/site/CatalogNotice";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, MessageCircle } from "lucide-react";
import { CtaBand, ProductCard, Section } from "@/components/site/Bits";
import { AddToBasket } from "@/components/site/AddToBasket";
import { SmartImage } from "@/components/site/SmartImage";
import { CakeGallery } from "@/components/site/CakeArtwork";
import { isCustomCakeProduct } from "@/lib/custom-cake-contract";
import { CUSTOM_CAKE_PRODUCT_SLUG, CUSTOM_CAKE_COVER_IMAGE } from "@/lib/custom-cake-contract";
import { isCakeDesignProduct } from "@/lib/cake-designs";
import { catalogQueryOptions, imageSrc, priceLabel, type ShopProduct } from "@/lib/shop";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/menu/$slug")({
  validateSearch: (search: Record<string, unknown>): { design?: string } => {
    const design = search["design"];
    return typeof design === "string" && /^[a-z0-9-]{2,120}$/.test(design) ? { design } : {};
  },
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions);
    const product = catalog.products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    const related = catalog.products
      .filter((p) => p.category_id === product.category_id && p.slug !== product.slug)
      .slice(0, 3);
    return {
      product,
      related,
      designs: catalog.products.filter((p) => isCakeDesignProduct(p.id, p.category_id)),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Not found — Wendy's Bakehouse" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const title = `${product.name} — Wendy's Bakehouse, Toronto`;
    const desc = `${product.short} ${priceLabel(product)}. ${product.lead_time}. Pickup in Etobicoke, Toronto.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: CatalogRouteError,
  notFoundComponent: ProductNotFound,
  component: ProductPage,
});

function ProductNotFound() {
  return (
    <Section>
      <h1 className="text-4xl">That bake isn&rsquo;t on the menu</h1>
      <p className="mt-4 text-muted-foreground">
        It may have been renamed or retired. The full menu is still here.
      </p>
      <Link
        to="/menu"
        search={{}}
        className="mt-6 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Back to the menu
      </Link>
    </Section>
  );
}

function ProductPage() {
  const contact = useShopContact();
  const { product, related, designs } = Route.useLoaderData() as {
    product: ShopProduct;
    related: ShopProduct[];
    designs: ShopProduct[];
  };
  const search = Route.useSearch();
  const selectedDesign = isCustomCakeProduct(product.id)
    ? designs.find((p) => p.slug === search.design)
    : undefined;
  const designListing = isCakeDesignProduct(product.id, product.category_id);

  const waText = encodeURIComponent(
    `Hi Wendy, I'd like to order: ${product.name} (${priceLabel(product)}). Could you confirm availability?`,
  );

  return (
    <>
      <Section className="!py-0">
        <nav aria-label="Breadcrumb" className="pt-10 text-sm text-muted-foreground">
          <Link to="/menu" search={{}} className="hover:text-primary">
            Menu
          </Link>
          <span className="px-2 text-gold">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 py-10 md:grid-cols-12 md:py-14">
          <div className="md:col-span-6">
            <div className="md:sticky md:top-28">
              {selectedDesign ? (
                <SmartImage
                  background="white"
                  src={imageSrc(selectedDesign)}
                  alt={selectedDesign.name}
                  ratio="aspect-[3/4]"
                  fit="contain"
                  priority
                />
              ) : isCustomCakeProduct(product.id) ? (
                <CakeGallery
                  images={[
                    { src: imageSrc(product) || CUSTOM_CAKE_COVER_IMAGE, alt: product.name },
                    ...designs.map((design) => ({ src: imageSrc(design), alt: design.name })),
                  ]}
                />
              ) : (
                <SmartImage
                  background="white"
                  src={imageSrc(product)}
                  alt={product.name}
                  ratio="aspect-square"
                  rounded="rounded-[1.75rem]"
                  priority
                />
              )}
            </div>
          </div>

          <div className="md:col-span-6">
            <h1 className="text-4xl md:text-5xl">{product.name}</h1>
            <p className="mt-5 font-display text-3xl text-gold">{priceLabel(product)}</p>
            {product.price_note && (
              <p className="mt-2 text-sm text-muted-foreground">{product.price_note}</p>
            )}
            <p className="eyebrow mt-4 text-[11px] text-muted-foreground">
              {product.lead_time} · {product.serves ?? "Pickup in Etobicoke"}
            </p>

            <p className="mt-6 max-w-[64ch] text-base leading-relaxed">{product.description}</p>

            <div className="mt-8">
              {designListing ? (
                <div className="space-y-4 rounded-lg border border-border p-5">
                  <p className="text-sm text-muted-foreground">
                    This photograph is a design reference. The starting price covers the simplest
                    qualifying custom cake; recreating this example may require paid extras. Choose
                    your size, layers and decorations to see your total.
                  </p>
                  <Link
                    to="/menu/$slug"
                    params={{ slug: CUSTOM_CAKE_PRODUCT_SLUG }}
                    search={{ design: product.slug }}
                    className="inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Customise this design
                  </Link>
                </div>
              ) : (
                <>
                  {selectedDesign && (
                    <p className="mb-4 font-semibold">Design reference: {selectedDesign.name}</p>
                  )}
                  <AddToBasket
                    key={selectedDesign?.id ?? product.id}
                    slug={product.slug}
                    design={selectedDesign}
                  />
                </>
              )}
            </div>

            <ul className="mt-8 space-y-2 border-t border-border pt-6 text-sm">
              {product.includes.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`${contact.whatsapp}?text=${waText}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-sm border border-input px-6 py-3.5 text-sm font-semibold"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat with Wendy
              </a>
            </div>

            <Accordion type="single" collapsible className="mt-10">
              <AccordionItem value="terms">
                <AccordionTrigger>Ordering terms</AccordionTrigger>
                <AccordionContent>
                  Everyday items are paid in full. Custom cakes require the deposit shown when
                  ordering, with the balance due before pickup or delivery. Your date is held after
                  payment is confirmed.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pickup">
                <AccordionTrigger>Pickup &amp; delivery</AccordionTrigger>
                <AccordionContent>
                  Pickup is in Etobicoke, Toronto; the exact address is sent once your date is
                  confirmed. Delivery is $30 in Etobicoke or $35 in covered GTA postal zones and is
                  confirmed from your postal code at checkout.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="policies">
                <AccordionTrigger>Full policies</AccordionTrigger>
                <AccordionContent>
                  Read the complete payment, pickup, delivery and allergen terms on the{" "}
                  <Link to="/policies" className="font-semibold underline underline-offset-4">
                    Policies page
                  </Link>
                  .
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="allergens">
                <AccordionTrigger>Allergens</AccordionTrigger>
                <AccordionContent>
                  Baked in a single bakery that handles wheat, dairy, egg and nuts, so cross-contact
                  cannot be ruled out. Tell me about allergies when you order.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section tone="sand">
          <h2 className="text-3xl">You might also like</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand />
    </>
  );
}
