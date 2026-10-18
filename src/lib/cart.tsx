import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { PricingMode } from "@/lib/shop";
import { previewCart } from "@/lib/orders.functions";

export type CartItem = {
  /** Optional for carts persisted before stable product IDs were stored. */
  product_id?: string;
  slug: string;
  name: string;
  quantity: number;
  pricing_mode: PricingMode;
  price_cents: number | null;
  deposit_cents: number | null;
  deposit_percent: number | null;
  options: Record<string, string>;
  choices?: { group_key: string; choice_key: string }[];
  notes?: string;
  image_key?: string | null;
  image_url?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  quote: {
    lines: {
      product_slug: string;
      payment_rule: "full" | "deposit";
      line_total_cents: number;
      line_due_now_cents: number;
      deposit_percent: number | null;
    }[];
    subtotal_cents: number;
    total_cents: number;
    due_now_cents: number;
    balance_cents: number;
    requires_deposit: boolean;
  } | null;
  isPricing: boolean;
  pricingError: string | null;
  add: (item: CartItem) => void;
  remove: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "wb-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const preview = useServerFn(previewCart);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore malformed storage */
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, storageLoaded]);

  const pricing = useQuery({
    queryKey: [
      "basket-price",
      items.map((item) => ({
        slug: item.slug,
        quantity: item.quantity,
        choices: item.choices ?? [],
      })),
    ],
    enabled: items.length > 0,
    queryFn: () =>
      preview({
        data: {
          fulfilment: "pickup",
          items: items.map((item) => ({
            slug: item.slug,
            quantity: item.quantity,
            choices: item.choices ?? [],
            notes: item.notes,
          })),
        },
      }),
  });

  const quote = pricing.data?.ok ? pricing.data.cart : null;

  const add = useCallback((item: CartItem) => {
    setItems((current) => {
      const key = JSON.stringify([item.slug, item.options, item.notes ?? ""]);
      const idx = current.findIndex(
        (c) => JSON.stringify([c.slug, c.options, c.notes ?? ""]) === key,
      );
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx]!, quantity: next[idx]!.quantity + item.quantity };
        return next;
      }
      return [...current, item];
    });
  }, []);

  const remove = useCallback((index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  }, []);

  const setQuantity = useCallback((index: number, quantity: number) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      quote,
      isPricing: items.length > 0 && pricing.isFetching,
      pricingError: pricing.data && !pricing.data.ok ? pricing.data.message : null,
      add,
      remove,
      setQuantity,
      clear,
    }),
    [items, quote, pricing.isFetching, pricing.data, add, remove, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
