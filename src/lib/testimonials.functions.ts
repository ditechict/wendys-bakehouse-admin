import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppDatabase } from "@/lib/database.types";

type Ctx = { supabase: unknown; userId: string };
type Rpc = { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> };

async function assertStaff(context: Ctx) {
  const { data } = await (context.supabase as Rpc).rpc("is_staff");
  if (data !== true) throw new Error("Forbidden");
}

async function db(): Promise<SupabaseClient<AppDatabase>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<AppDatabase>;
}

const TESTIMONIAL_PATH = /^testimonials\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function hasSignature(bytes: Uint8Array, type: (typeof IMAGE_TYPES)[number]): boolean {
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= sig.length && sig.every((byte, i) => bytes[i] === byte);
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

export const getTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  return [] as { id: string; image_path: string; alt_text: string; customer_label: string | null; sort_order: number }[];
});

export const adminListTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const admin = await db();
    const { data, error } = await admin.from("testimonials").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateTestimonialUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        content_type: z.enum(IMAGE_TYPES),
        size_bytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const admin = await db();
    const path = `testimonials/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[data.content_type]}`;
    const { data: upload, error } = await admin.storage
      .from("testimonial-images")
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !upload) throw new Error("Could not prepare the review upload.");
    return { path, token: upload.token };
  });

export const adminFinalizeTestimonialUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        path: z.string().regex(TESTIMONIAL_PATH),
        content_type: z.enum(IMAGE_TYPES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const admin = await db();
    const { data: image, error } = await admin.storage
      .from("testimonial-images")
      .download(data.path);
    if (error || !image) throw new Error("Could not verify the uploaded review image.");

    const bytes = new Uint8Array(await image.arrayBuffer());
    if (
      bytes.byteLength === 0 ||
      bytes.byteLength > MAX_IMAGE_BYTES ||
      image.type !== data.content_type ||
      !data.path.endsWith(`.${IMAGE_EXTENSIONS[data.content_type]}`) ||
      !hasSignature(bytes, data.content_type)
    ) {
      await admin.storage.from("testimonial-images").remove([data.path]);
      throw new Error("The uploaded review is not a valid supported image.");
    }
    return { path: data.path };
  });

const testimonialSchema = z.object({
  id: z.string().uuid().optional(),
  image_path: z.string().regex(TESTIMONIAL_PATH),
  alt_text: z.string().trim().min(8).max(240),
  customer_label: z.string().trim().min(2).max(120),
  visible: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
});

export const adminSaveTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => testimonialSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const admin = await db();
    const { id, ...row } = data;
    if (id) {
      const { error } = await admin.from("testimonials").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await admin
      .from("testimonials")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that review.");
    return { id: created.id };
  });

export const adminDeleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const admin = await db();
    const { data: row, error: readError } = await admin
      .from("testimonials")
      .select("image_path")
      .eq("id", data.id)
      .single();
    if (readError) throw new Error(readError.message);
    const { error } = await admin.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await admin.storage.from("testimonial-images").remove([row.image_path]);
    return { ok: true };
  });

export const adminDiscardTestimonialUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().regex(TESTIMONIAL_PATH) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const admin = await db();
    const { count } = await admin
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("image_path", data.path);
    if (!count) await admin.storage.from("testimonial-images").remove([data.path]);
    return { ok: true };
  });
