import { z } from "zod";

/** Client-safe validation shared by every order entry point. */

export const MAX_SLIP_BYTES = 5 * 1024 * 1024;

export const SLIP_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export const SLIP_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const;

export const itemSchema = z.object({
  slug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(99),
  options: z.record(z.string().max(80), z.string().max(1000)).default({}),
  choices: z
    .array(z.object({ group_key: z.string().max(80), choice_key: z.string().max(80) }))
    .max(30)
    .default([]),
  notes: z.string().trim().max(500).optional(),
});

export const slipSchema = z.object({
  filename: z.string().trim().min(1).max(160),
  content_type: z.enum(SLIP_CONTENT_TYPES),
  data_base64: z
    .string()
    .min(1)
    .max(Math.ceil((MAX_SLIP_BYTES * 4) / 3) + 1024),
});

/** Customer and fulfilment details, shared by every checkout method. */
export const customerFields = {
  customer_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(40),
  pickup_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  pickup_window: z.string().trim().max(60).optional(),
  fulfilment: z.enum(["pickup", "delivery"]),
  delivery_area: z.string().trim().max(160).optional(),
  delivery_postal_code: z.string().trim().max(12).optional(),
  occasion: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  allergies: z.string().trim().max(500).optional(),
  heard_from: z.string().trim().max(80).optional(),
  items: z.array(itemSchema).min(1).max(30),
};

export const orderSchema = z.object({
  ...customerFields,
  checkout_method: z.enum(["whatsapp", "bank_transfer"]),
  payer_name: z.string().trim().max(100).optional(),
  transfer_reference: z.string().trim().max(80).optional(),
  transfer_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export const cardOrderSchema = z.object(customerFields);

export type PlaceOrderInput = z.input<typeof orderSchema>;
export type CardOrderInput = z.input<typeof cardOrderSchema>;
export type OrderCoreInput = z.output<typeof cardOrderSchema>;
