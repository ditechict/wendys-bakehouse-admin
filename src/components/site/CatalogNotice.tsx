import { useShopContact } from "@/lib/use-shop-contact";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";

/** Keep existing cards visible on refresh failure; offer a direct enquiry fallback. */
export function CatalogNotice({
  retry,
  busy,
  cached = false,
  empty = false,
}: {
  retry: () => void;
  busy: boolean;
  cached?: boolean;
  empty?: boolean;
}) {
  const contact = useShopContact();
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-xl border border-border bg-card p-6"
    >
      <p className="font-display text-xl">
        {empty
          ? "The cake menu is being updated."
          : cached
            ? "We couldn’t refresh the cake menu."
            : "The cake menu is taking a little longer."}
      </p>
      <p className="mt-2 max-w-[65ch] text-sm text-muted-foreground">
        {cached
          ? "You can still browse the cakes already loaded. Retry for the latest details, or ask Wendy on WhatsApp."
          : "Please try again, or contact Wendy on WhatsApp to discuss your cake, date and current prices."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retry}
          disabled={busy}
          className="min-h-11 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Trying again…" : "Retry cake menu"}
        </button>
        <a
          href={contact.whatsapp}
          className="min-h-11 rounded-sm border border-border px-5 py-3 text-sm font-semibold"
        >
          Chat with Wendy
        </a>
      </div>
    </div>
  );
}

/** Recover catalogue-dependent pages without a blank or technical error screen. */
export function CatalogRouteError() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    try {
      await router.invalidate();
    } catch {
      /* Keep the enquiry fallback available. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-14">
      <CatalogNotice retry={() => void retry()} busy={busy} />
    </section>
  );
}
