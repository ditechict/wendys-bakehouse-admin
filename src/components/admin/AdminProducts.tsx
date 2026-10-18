import { ProductImageCrop } from "./ProductImageCrop";
import { cropProductImage } from "@/lib/product-image-crop";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUp, Plus, Search, Trash2 } from "lucide-react";
import {
  adminCreateProductImageUpload,
  adminDeleteProduct,
  adminDiscardProductImageUpload,
  adminFinalizeProductImageUpload,
  adminListProducts,
  adminSaveProduct,
} from "@/lib/admin.functions";
import { CUSTOM_CAKE_PRODUCT_ID, isCustomCakeProduct } from "@/lib/custom-cake-contract";
import { isCakeDesignProduct } from "@/lib/cake-designs";
import { SmartImage } from "@/components/site/SmartImage";
import { formatMoney, imageSrc } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { AdminProductOptions } from "@/components/admin/AdminProductOptions";
import { AdminPricing } from "@/components/admin/AdminPricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Catalog = Awaited<ReturnType<typeof adminListProducts>>;
type ProductRow = Catalog["products"][number];
type Status = "available" | "unavailable" | "archived";
type PaymentRule = "full" | "deposit";

type Draft = {
  id?: string;
  slug: string;
  name: string;
  category_id: string | null;
  short: string;
  description: string;
  payment_rule: PaymentRule;
  price: string;
  deposit_percent: string;
  pack_size: string;
  pack_unit: string;
  price_note: string;
  lead_time: string;
  serves: string;
  includes: string;
  image_key: string;
  image_url: string;
  status: Status;
  sort_order: number;
};

function toDraft(p?: ProductRow): Draft {
  const includes = Array.isArray(p?.includes) ? (p.includes as string[]) : [];
  return {
    ...(p ? { id: p.id } : {}),
    slug: p?.slug ?? "",
    name: p?.name ?? "",
    category_id: p?.category_id ?? null,
    short: p?.short ?? "",
    description: p?.description ?? "",
    payment_rule: (p?.payment_rule as PaymentRule) ?? "full",
    price: p?.price_cents != null ? (p.price_cents / 100).toString() : "",
    deposit_percent: p?.deposit_percent != null ? String(p.deposit_percent) : "70",
    pack_size: p?.pack_size != null ? String(p.pack_size) : "",
    pack_unit: p?.pack_unit ?? "",
    price_note: p?.price_note ?? "",
    lead_time: p?.lead_time ?? "",
    serves: p?.serves ?? "",
    includes: includes.join("\n"),
    image_key: p?.image_key ?? "",
    image_url: p?.image_url ?? "",
    status: (p?.status as Status) ?? "available",
    sort_order: p?.sort_order ?? 0,
  };
}

function toCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const STATUS_TONE: Record<Status, "default" | "secondary" | "outline"> = {
  available: "default",
  unavailable: "secondary",
  archived: "outline",
};

const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ProductImageType = (typeof PRODUCT_IMAGE_TYPES)[number];
type PendingImage = {
  file: File;
  content_type: ProductImageType;
  preview_url: string;
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isProductImageType(value: string): value is ProductImageType {
  return (PRODUCT_IMAGE_TYPES as readonly string[]).includes(value);
}

export function AdminProducts() {
  const listProducts = useServerFn(adminListProducts);
  const saveProduct = useServerFn(adminSaveProduct);
  const deleteProduct = useServerFn(adminDeleteProduct);
  const createProductImageUpload = useServerFn(adminCreateProductImageUpload);
  const finalizeProductImageUpload = useServerFn(adminFinalizeProductImageUpload);
  const discardProductImageUpload = useServerFn(adminDiscardProductImageUpload);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listProducts(),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [unsavedImagePath, setUnsavedImagePath] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const discardUpload = (path: string) => {
    void discardProductImageUpload({ data: { path } }).catch(() => undefined);
  };

  const clearPendingImage = () => {
    setCropTop(0);
    setCropBottom(0);
    setPendingImage((current) => {
      if (current) URL.revokeObjectURL(current.preview_url);
      return null;
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const openEditor = (product?: ProductRow) => {
    setPricingOpen(false);
    clearPendingImage();
    if (unsavedImagePath) {
      discardUpload(unsavedImagePath);
      setUnsavedImagePath(null);
    }
    setDraft(toDraft(product));
  };

  const closeEditor = (shouldDiscardUpload = true) => {
    setPricingOpen(false);
    clearPendingImage();
    if (shouldDiscardUpload && unsavedImagePath) {
      discardUpload(unsavedImagePath);
    }
    setUnsavedImagePath(null);
    setDraft(null);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      let imageUrl = d.image_url.trim() || null;
      const selectedImage = pendingImage;
      if (selectedImage) {
        const croppedFile = await cropProductImage(selectedImage.file, cropTop, cropBottom);
        const contentType = croppedFile.type as ProductImageType;
        const prepared = await createProductImageUpload({
          data: {
            slug: d.slug.trim(),
            content_type: contentType,
            size_bytes: croppedFile.size,
          },
        });
        if (unsavedImagePath && unsavedImagePath !== prepared.path) {
          discardUpload(unsavedImagePath);
        }
        setUnsavedImagePath(prepared.path);
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .uploadToSignedUrl(prepared.path, prepared.token, croppedFile, {
            cacheControl: "31536000",
            contentType,
            upsert: false,
          });
        if (uploadError) throw new Error("Could not upload that image. Please try again.");

        const uploaded = await finalizeProductImageUpload({
          data: { path: prepared.path, content_type: contentType },
        });
        imageUrl = uploaded.image_url;
        setDraft((current) => (current ? { ...current, image_url: uploaded.image_url } : current));
        clearPendingImage();
      }

      return saveProduct({
        data: {
          ...(d.id ? { id: d.id } : {}),
          slug: d.slug.trim(),
          name: d.name.trim(),
          category_id: d.category_id,
          short: d.short.trim(),
          description: d.description.trim(),
          payment_rule: d.payment_rule,
          price_cents: toCents(d.price),
          deposit_cents: null,
          deposit_percent:
            d.payment_rule === "deposit" && d.deposit_percent.trim()
              ? Number(d.deposit_percent)
              : null,
          pack_size: d.pack_size.trim() ? Number(d.pack_size) : null,
          pack_unit: d.pack_unit.trim() || null,
          price_note: d.price_note.trim() || null,
          lead_time: d.lead_time.trim(),
          serves: d.serves.trim() || null,
          includes: d.includes
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          image_url: imageUrl,
          status: d.status,
          sort_order: d.sort_order,
        },
      });
    },
    onSuccess: () => {
      toast.success("Product saved.");
      closeEditor(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product removed.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = data?.categories ?? [];

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!term) return true;
      return `${p.name} ${p.slug}`.toLowerCase().includes(term);
    });
  }, [data?.products, search, statusFilter]);

  const imagePreview = draft
    ? (pendingImage?.preview_url ??
      (draft.image_url || draft.image_key
        ? imageSrc({ image_url: draft.image_url || null, image_key: draft.image_key || null })
        : null))
    : null;

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-[1rem]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-[1rem] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load products."}
      </p>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search cakes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New product
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing matches those filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="rounded-[1rem] border border-border bg-card p-4">
              <SmartImage
                src={imageSrc(p)}
                alt={p.name}
                ratio="aspect-[4/3]"
                rounded="rounded-[0.75rem]"
                fit="contain"
              />
              <div className="mt-3 flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-tight">{p.name}</h3>
                <Badge variant={STATUS_TONE[(p.status as Status) ?? "available"]}>{p.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isCakeDesignProduct(p.id, p.category_id)
                  ? "Uses Custom celebration cake pricing"
                  : formatMoney(p.price_cents ?? 0)}
                {p.payment_rule === "deposit"
                  ? p.deposit_percent != null
                    ? ` · ${p.deposit_percent}% deposit`
                    : ` · ${formatMoney(p.deposit_cents ?? 0)} legacy deposit`
                  : ""}
                {p.pack_size ? ` · ${p.pack_size} ${p.pack_unit ?? "pieces"} per pack` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditor(p)}>
                  Edit
                </Button>
                {p.status !== "archived" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => save.mutate({ ...toDraft(p), status: "archived" })}
                  >
                    Archive
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => save.mutate({ ...toDraft(p), status: "available" })}
                  >
                    Restore
                  </Button>
                )}
                {!isCustomCakeProduct(p.id) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Delete ${p.name}? Archive is usually safer.`)) {
                        remove.mutate(p.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && !save.isPending && closeEditor(true)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit product" : "New product"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate(draft);
                }}
              >
                <Field label="Name">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Slug (web address)">
                  <Input
                    value={draft.slug}
                    readOnly={isCustomCakeProduct(draft.id ?? "")}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Collection">
                  <Select
                    value={draft.category_id ?? "none"}
                    onValueChange={(v) =>
                      setDraft({ ...draft, category_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No collection</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Short line">
                  <Input
                    value={draft.short}
                    onChange={(e) => setDraft({ ...draft, short: e.target.value })}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    rows={4}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </Field>
                {isCakeDesignProduct(draft.id ?? "", draft.category_id) && (
                  <p className="text-sm">
                    This design uses the shared Custom celebration cake configurator. Edit its name,
                    description and photograph here. Use Edit pricing below for the shared prices,
                    minimums, deposit and paid extras.
                  </p>
                )}
                {!isCakeDesignProduct(draft.id ?? "", draft.category_id) && (
                  <>
                    <Field label="Payment">
                      <Select
                        value={draft.payment_rule}
                        disabled={!!draft.id}
                        onValueChange={(v) =>
                          setDraft({ ...draft, payment_rule: v as PaymentRule })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Pay in full at checkout</SelectItem>
                          <SelectItem value="deposit">Deposit now, balance later</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {isCustomCakeProduct(draft.id ?? "") && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        This product always takes a percentage deposit. Its minimum and tier rules
                        remain enforced when the deposit percentage changes.
                      </p>
                    )}
                    {draft.id && (
                      <p className="text-sm">
                        Edit prices, minimums and deposits in the pricing section below. Product
                        details and pricing are saved separately.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Price (CAD)">
                        <Input
                          inputMode="decimal"
                          readOnly={!!draft.id}
                          required
                          value={draft.price}
                          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                        />
                      </Field>
                      <Field label="Deposit (%)">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          required={draft.payment_rule === "deposit"}
                          disabled={!!draft.id || draft.payment_rule !== "deposit"}
                          value={draft.deposit_percent}
                          onChange={(e) => setDraft({ ...draft, deposit_percent: e.target.value })}
                        />
                      </Field>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Pieces per pack (optional)">
                    <Input
                      inputMode="numeric"
                      placeholder="12"
                      value={draft.pack_size}
                      onChange={(e) => setDraft({ ...draft, pack_size: e.target.value })}
                    />
                  </Field>
                  <Field label="Pack contains (e.g. cupcakes)">
                    <Input
                      value={draft.pack_unit}
                      onChange={(e) => setDraft({ ...draft, pack_unit: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price note">
                    <Input
                      value={draft.price_note}
                      onChange={(e) => setDraft({ ...draft, price_note: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Lead time (e.g. 5 days)">
                    <Input
                      value={draft.lead_time}
                      onChange={(e) => setDraft({ ...draft, lead_time: e.target.value })}
                    />
                  </Field>
                  <Field label="Serves">
                    <Input
                      value={draft.serves}
                      onChange={(e) => setDraft({ ...draft, serves: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Includes (one per line)">
                  <Textarea
                    rows={3}
                    value={draft.includes}
                    onChange={(e) => setDraft({ ...draft, includes: e.target.value })}
                  />
                </Field>
                <Field label="Product image">
                  <div className="space-y-3 rounded-[0.9rem] border border-border p-3">
                    {pendingImage ? (
                      <ProductImageCrop
                        file={pendingImage.file}
                        top={cropTop}
                        bottom={cropBottom}
                        onChange={(top, bottom) => {
                          setCropTop(top);
                          setCropBottom(bottom);
                        }}
                      />
                    ) : imagePreview ? (
                      <img
                        src={imagePreview}
                        alt={draft.name ? `${draft.name} preview` : "Product preview"}
                        className="aspect-[4/3] w-full rounded-[0.7rem] bg-white object-contain"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center rounded-[0.7rem] bg-secondary text-sm text-muted-foreground">
                        No product image
                      </div>
                    )}
                    <Input
                      ref={imageInputRef}
                      id="product-image-upload"
                      aria-label="Product image"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      disabled={save.isPending}
                      onChange={(event) => {
                        const input = event.currentTarget;
                        const file = input.files?.[0];
                        if (!file) return;
                        if (!isProductImageType(file.type)) {
                          toast.error("Choose a JPG, PNG or WebP image.");
                          input.value = "";
                          return;
                        }
                        if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
                          toast.error("Choose an image up to 5MB.");
                          input.value = "";
                          return;
                        }
                        setCropTop(0);
                        setCropBottom(0);
                        const contentType: ProductImageType = file.type;
                        setPendingImage((current) => {
                          if (current) URL.revokeObjectURL(current.preview_url);
                          return {
                            file,
                            content_type: contentType,
                            preview_url: URL.createObjectURL(file),
                          };
                        });
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ImageUp className="h-3.5 w-3.5" aria-hidden="true" />
                        {pendingImage
                          ? `${pendingImage.file.name} will upload when you save.`
                          : "JPG, PNG or WebP, up to 5MB."}
                      </span>
                      {(pendingImage || draft.image_url) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive"
                          disabled={save.isPending}
                          onClick={() => {
                            clearPendingImage();
                            if (unsavedImagePath) {
                              discardUpload(unsavedImagePath);
                              setUnsavedImagePath(null);
                            }
                            setDraft({ ...draft, image_url: "" });
                          }}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sort order">
                    <Input
                      type="number"
                      value={draft.sort_order}
                      onChange={(e) =>
                        setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={draft.status}
                      onValueChange={(v) => setDraft({ ...draft, status: v as Status })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {isCakeDesignProduct(draft.id ?? "", draft.category_id) ? (
                  <p className="text-sm text-muted-foreground">
                    Sizes, flavours and paid extras are inherited from the main custom cake.
                  </p>
                ) : draft.id ? (
                  <div className="rounded-[0.75rem] border border-border bg-muted/30 p-3">
                    <h4 className="font-display text-lg">Customer choices</h4>
                    <div className="mt-2">
                      <AdminProductOptions productId={draft.id} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save the product first, then add sizes, flavours and other choices.
                  </p>
                )}
                <Button type="submit" disabled={save.isPending} className="w-full">
                  {save.isPending ? "Saving…" : "Save product"}
                </Button>
              </form>
              {(draft.id || isCakeDesignProduct("", draft.category_id)) && (
                <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                  <h3 className="font-display text-xl">Product pricing</h3>
                  {isCakeDesignProduct(draft.id ?? "", draft.category_id) && (
                    <p className="text-sm text-muted-foreground">
                      Shared custom-cake pricing: changes here affect every design using the
                      Custom celebration cake configurator. This does not set a separate price for
                      this photograph. Design costs must use the supported paid extras.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Save product details with Save product above. Review and save pricing separately
                    below; saving one section does not save changes in the other.
                  </p>
                  <Button type="button" variant="outline" onClick={() => setPricingOpen(!pricingOpen)}>
                    {pricingOpen ? "Close pricing editor" : "Edit pricing"}
                  </Button>
                  {pricingOpen && (
                    <AdminPricing
                      productId={isCakeDesignProduct(draft.id ?? "", draft.category_id)
                        ? CUSTOM_CAKE_PRODUCT_ID : draft.id}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
