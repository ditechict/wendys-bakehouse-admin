import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { catalogQueryOptions, formatMoney, packLabel, type ShopProduct } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import { previewCart } from "@/lib/orders.functions";

export function AddToBasket({ slug, design }: { slug: string; design?: ShopProduct | undefined }) {
  const { data } = useQuery(catalogQueryOptions);
  const preview = useServerFn(previewCart);
  const { add } = useCart();
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const product = data?.products.find((candidate) => candidate.slug === slug);
  const choices =
    product?.options.flatMap((group) =>
      (selected[group.key] ?? []).map((choiceKey) => ({
        group_key: group.key,
        choice_key: choiceKey,
      })),
    ) ?? [];
  const hasRequiredChoices =
    product?.options.every((group) => !group.required || (selected[group.key]?.length ?? 0) > 0) ??
    false;

  const pricing = useQuery({
    queryKey: ["product-price", product?.slug, quantity, choices],
    enabled: Boolean(product && hasRequiredChoices),
    queryFn: () =>
      preview({
        data: {
          fulfilment: "pickup",
          items: [
            {
              slug: product!.slug,
              quantity,
              choices,
            },
          ],
        },
      }),
  });

  if (!product) return null;

  const quote = pricing.data?.ok ? pricing.data.cart : null;
  const line = quote?.lines[0];
  const pack = packLabel(product);
  const isDeposit = product.payment_rule === "deposit";
  const pricingError = pricing.data && !pricing.data.ok ? pricing.data.message : null;

  function toggleChoice(groupKey: string, choiceKey: string, checked: boolean) {
    setSelected((current) => {
      const values = current[groupKey] ?? [];
      return {
        ...current,
        [groupKey]: checked
          ? [...values, choiceKey]
          : values.filter((value) => value !== choiceKey),
      };
    });
  }

  return (
    <div className="rounded-[1.5rem] border border-border bg-secondary p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-display text-2xl text-gold">
          {line
            ? formatMoney(line.unit_total_cents)
            : `From ${formatMoney(product.starting_price_cents)}`}
        </p>
        {pack && <p className="text-sm text-muted-foreground">{pack}</p>}
        {isDeposit && (
          <p className="text-sm text-muted-foreground">
            {product.deposit_percent != null
              ? `${product.deposit_percent}% deposit holds your date`
              : `${formatMoney(product.deposit_cents)} deposit holds your date`}
          </p>
        )}
      </div>

      {product.options.length > 0 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {product.options.map((group) =>
            group.allow_multiple ? (
              <fieldset key={group.key} className="sm:col-span-2">
                <legend className="text-sm font-semibold">
                  {group.label}
                  {group.required && <span className="text-gold"> *</span>}
                  <span className="ml-2 font-normal text-muted-foreground">Choose any</span>
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {group.choices.map((choice) => (
                    <label
                      key={choice.key}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(selected[group.key] ?? []).includes(choice.key)}
                        onChange={(event) =>
                          toggleChoice(group.key, choice.key, event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span>
                        {choice.label}
                        {choice.price_delta_cents !== 0 && (
                          <span className="ml-1 text-muted-foreground">
                            ({choice.price_delta_cents > 0 ? "+" : "-"}
                            {formatMoney(Math.abs(choice.price_delta_cents))})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <label key={group.key} className="block text-sm font-semibold">
                {group.label}
                {group.required && <span className="text-gold"> *</span>}
                <select
                  value={selected[group.key]?.[0] ?? ""}
                  onChange={(event) =>
                    setSelected((current) => ({
                      ...current,
                      [group.key]: event.target.value ? [event.target.value] : [],
                    }))
                  }
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                >
                  <option value="">{group.required ? "Choose one" : "None"}</option>
                  {group.choices.map((choice) => (
                    <option key={choice.key} value={choice.key}>
                      {choice.label}
                      {choice.price_delta_cents !== 0
                        ? ` (${choice.price_delta_cents > 0 ? "+" : "-"}${formatMoney(Math.abs(choice.price_delta_cents))})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            ),
          )}
        </div>
      )}

      <div className="mt-5 min-h-5 text-sm" aria-live="polite">
        {pricing.isFetching && <p className="text-muted-foreground">Checking your total...</p>}
        {!pricing.isFetching && pricingError && <p className="text-destructive">{pricingError}</p>}
        {!pricing.isFetching && line && (
          <p className="text-muted-foreground">
            Order total {formatMoney(line.line_total_cents)}
            {isDeposit &&
              `; ${formatMoney(line.line_due_now_cents)} due now and ${formatMoney(quote?.balance_cents)} due before pickup or delivery`}
            .
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold">
          Qty
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(event) =>
              setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))
            }
            className="ml-3 h-10 w-20 rounded-md border border-input bg-background px-3 text-sm font-normal"
          />
        </label>
        <button
          type="button"
          disabled={pricing.isFetching}
          onClick={() => {
            const missing = product.options.find(
              (group) => group.required && (selected[group.key]?.length ?? 0) === 0,
            );
            if (missing) {
              toast.error(`Choose a ${missing.label.toLowerCase()} first.`);
              return;
            }
            if (!line) {
              toast.error(pricingError ?? "We could not confirm that total. Please try again.");
              return;
            }

            const labels: Record<string, string> = {};
            for (const group of product.options) {
              const choiceLabels = (selected[group.key] ?? [])
                .map((choiceKey) => group.choices.find((choice) => choice.key === choiceKey)?.label)
                .filter((label): label is string => Boolean(label));
              if (choiceLabels.length > 0) labels[group.label] = choiceLabels.join(", ");
            }

            add({
              product_id: product.id,
              slug: product.slug,
              name: product.name,
              quantity,
              pricing_mode: isDeposit ? "deposit" : "fixed",
              price_cents: line.unit_total_cents,
              deposit_cents: product.deposit_cents,
              deposit_percent: product.deposit_percent,
              choices,
              options: labels,
              image_key: product.image_key,
              image_url: product.image_url,
              ...(design
                ? {
                    image_url: design.image_url,
                    notes: `Design reference: ${design.name} (${design.slug}). Decorations depend on selected options.`,
                  }
                : {}),
            });
            toast.success(`${product.name} added to your basket.`);
          }}
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {line
            ? `Add to basket - ${formatMoney(line.line_due_now_cents)}`
            : "Choose options to price"}
        </button>
        <Link
          to="/cart"
          className="text-sm font-semibold underline decoration-gold underline-offset-4"
        >
          View basket
        </Link>
      </div>
    </div>
  );
}
