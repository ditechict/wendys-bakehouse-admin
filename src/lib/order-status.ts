/**
 * Single authoritative source for order + payment lifecycle rules.
 * Imported by the admin server functions (enforcement) and the admin UI
 * (which moves it may offer). Never duplicate these lists elsewhere.
 */

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "baking",
  "ready",
  "collected",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = [
  "not_paid",
  "pending_verification",
  // Card payments: awaiting Stripe's confirmation, then set by the webhook.
  "pending",
  "expired",
  "failed",
  "paid",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Only these moves are allowed; anything else is rejected server-side. */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["baking", "cancelled"],
  baking: ["ready", "cancelled"],
  ready: ["collected", "cancelled"],
  collected: [],
  cancelled: [],
};

const NEXT_PAYMENT: Record<PaymentStatus, PaymentStatus[]> = {
  not_paid: ["pending_verification"],
  pending_verification: ["paid", "not_paid"],
  pending: ["paid", "expired", "failed", "not_paid"],
  expired: ["not_paid"],
  failed: ["not_paid"],
  paid: ["refunded"],
  refunded: [],
};

export function nextOrderStatuses(current: string): OrderStatus[] {
  return ORDER_STATUSES.includes(current as OrderStatus) ? NEXT_STATUS[current as OrderStatus] : [];
}

export function nextPaymentStatuses(current: string): PaymentStatus[] {
  return PAYMENT_STATUSES.includes(current as PaymentStatus)
    ? NEXT_PAYMENT[current as PaymentStatus]
    : [];
}

/** Human label for any lifecycle value. */
export function statusLabel(value: string): string {
  return value.replace(/_/g, " ");
}
