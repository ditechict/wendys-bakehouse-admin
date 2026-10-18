import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  adminDeleteDeliveryZone,
  adminGetSettings,
  adminListDeliveryZones,
  adminSaveDeliveryZone,
  adminSaveSettings,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DeliveryMode = "pickup_only" | "fixed_zones" | "distance";
type Band = { max_km: number; fee_cents: number };

type Form = {
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  bank_note: string;
  whatsapp_number: string;
  delivery_mode: DeliveryMode;
  delivery_origin_postal_code: string;
  delivery_distance_bands: Band[];
};

function readBands(config: unknown): Band[] {
  const bands = (config as { bands?: unknown } | null)?.bands;
  if (!Array.isArray(bands)) return [];
  return bands
    .map((b) => b as { max_km?: unknown; fee_cents?: unknown })
    .filter((b) => typeof b.max_km === "number" && typeof b.fee_cents === "number")
    .map((b) => ({ max_km: b.max_km as number, fee_cents: b.fee_cents as number }));
}

export function AdminSettings() {
  const getSettings = useServerFn(adminGetSettings);
  const saveSettings = useServerFn(adminSaveSettings);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => getSettings(),
  });

  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        bank_account_name: data.bank_account_name,
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
        bank_note: data.bank_note,
        whatsapp_number: data.whatsapp_number,
        delivery_mode: (data.delivery_mode as DeliveryMode) ?? "pickup_only",
        delivery_origin_postal_code: data.delivery_origin_postal_code ?? "",
        delivery_distance_bands: readBands(data.delivery_distance_config),
      });
    }
  }, [data, form]);

  const save = useMutation({
    mutationFn: (values: Form) =>
      saveSettings({
        data: {
          id: data!.id,
          ...values,
          delivery_origin_postal_code: values.delivery_origin_postal_code.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["shop-contact"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending || !form) return <Skeleton className="h-80 w-full max-w-lg rounded-[1rem]" />;

  return (
    <div className="max-w-2xl space-y-10">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <h3 className="font-display text-xl">Contact and payment</h3>
        <div className="space-y-2">
          <Label>WhatsApp number</Label>
          <Input
            value={form.whatsapp_number}
            onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Bank name</Label>
          <Input
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Account name</Label>
          <Input
            value={form.bank_account_name}
            onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Account number</Label>
          <Input
            value={form.bank_account_number}
            onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Transfer note shown at checkout</Label>
          <Textarea
            rows={3}
            value={form.bank_note}
            onChange={(e) => setForm({ ...form, bank_note: e.target.value })}
          />
        </div>

        <h3 className="pt-4 font-display text-xl">Delivery</h3>
        <div className="space-y-2">
          <Label>How delivery is priced</Label>
          <Select
            value={form.delivery_mode}
            onValueChange={(v) => setForm({ ...form, delivery_mode: v as DeliveryMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pickup_only">Pickup only — no delivery</SelectItem>
              <SelectItem value="fixed_zones">Set fee per postal-code area</SelectItem>
              <SelectItem value="distance">Fee by driving distance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.delivery_mode === "distance" && (
          <>
            <div className="space-y-2">
              <Label>Postal code you deliver from</Label>
              <Input
                value={form.delivery_origin_postal_code}
                onChange={(e) => setForm({ ...form, delivery_origin_postal_code: e.target.value })}
                placeholder="M9C"
              />
            </div>
            <div className="space-y-2">
              <Label>Distance bands</Label>
              {form.delivery_distance_bands.map((band, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">up to</span>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    aria-label="Kilometres"
                    value={String(band.max_km)}
                    onChange={(e) => {
                      const bands = [...form.delivery_distance_bands];
                      bands[i] = { ...band, max_km: Number(e.target.value) || 0 };
                      setForm({ ...form, delivery_distance_bands: bands });
                    }}
                  />
                  <span className="text-sm text-muted-foreground">km costs $</span>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    aria-label="Fee in dollars"
                    value={(band.fee_cents / 100).toString()}
                    onChange={(e) => {
                      const bands = [...form.delivery_distance_bands];
                      bands[i] = {
                        ...band,
                        fee_cents: Math.round((Number(e.target.value) || 0) * 100),
                      };
                      setForm({ ...form, delivery_distance_bands: bands });
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label="Remove band"
                    onClick={() =>
                      setForm({
                        ...form,
                        delivery_distance_bands: form.delivery_distance_bands.filter(
                          (_, x) => x !== i,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    ...form,
                    delivery_distance_bands: [
                      ...form.delivery_distance_bands,
                      { max_km: 10, fee_cents: 1500 },
                    ],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add band
              </Button>
            </div>
          </>
        )}

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </form>

      {form.delivery_mode === "fixed_zones" && <DeliveryZones />}
    </div>
  );
}

function DeliveryZones() {
  const listZones = useServerFn(adminListDeliveryZones);
  const saveZone = useServerFn(adminSaveDeliveryZone);
  const deleteZone = useServerFn(adminDeleteDeliveryZone);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["admin", "delivery-zones"],
    queryFn: () => listZones(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "delivery-zones"] });
  };
  const onError = (e: Error) => toast.error(e.message);

  const upsert = useMutation({
    mutationFn: (input: {
      id?: string;
      name: string;
      postal_prefixes: string[];
      fee_cents: number;
      active: boolean;
      sort_order: number;
    }) => saveZone({ data: input }),
    onSuccess: invalidate,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteZone({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const [draft, setDraft] = useState({ name: "", prefixes: "", fee: "" });

  if (isPending) return <Skeleton className="h-40 w-full rounded-[1rem]" />;

  const zones = data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-xl">Delivery areas</h3>
        <p className="text-sm text-muted-foreground">
          Customers enter their postal code at checkout and pay the fee for their area.
        </p>
      </div>

      <ul className="space-y-3">
        {zones.map((z) => (
          <li
            key={z.id}
            className="flex flex-wrap items-center gap-2 rounded-[0.75rem] border border-border p-3"
          >
            <Input
              className="max-w-[180px]"
              aria-label="Area name"
              defaultValue={z.name}
              onBlur={(e) =>
                upsert.mutate({
                  id: z.id,
                  name: e.target.value,
                  postal_prefixes: z.postal_prefixes,
                  fee_cents: z.fee_cents,
                  active: z.active,
                  sort_order: z.sort_order,
                })
              }
            />
            <Input
              className="max-w-[220px]"
              aria-label="Postal code starts"
              defaultValue={z.postal_prefixes.join(", ")}
              onBlur={(e) =>
                upsert.mutate({
                  id: z.id,
                  name: z.name,
                  postal_prefixes: e.target.value
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                  fee_cents: z.fee_cents,
                  active: z.active,
                  sort_order: z.sort_order,
                })
              }
            />
            <div className="flex items-center gap-1">
              <span className="text-sm" aria-hidden="true">
                $
              </span>
              <Input
                className="w-24"
                inputMode="decimal"
                aria-label="Delivery fee"
                defaultValue={(z.fee_cents / 100).toString()}
                onBlur={(e) =>
                  upsert.mutate({
                    id: z.id,
                    name: z.name,
                    postal_prefixes: z.postal_prefixes,
                    fee_cents: Math.round((Number(e.target.value) || 0) * 100),
                    active: z.active,
                    sort_order: z.sort_order,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={z.active}
                onCheckedChange={(v) =>
                  upsert.mutate({
                    id: z.id,
                    name: z.name,
                    postal_prefixes: z.postal_prefixes,
                    fee_cents: z.fee_cents,
                    active: v,
                    sort_order: z.sort_order,
                  })
                }
              />
              Active
            </label>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="ml-auto text-destructive"
              aria-label={`Remove ${z.name}`}
              onClick={() => {
                if (confirm(`Remove ${z.name}?`)) remove.mutate(z.id);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Area name</Label>
          <Input
            className="max-w-[180px]"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Postal codes start with</Label>
          <Input
            className="max-w-[220px]"
            placeholder="M8, M9"
            value={draft.prefixes}
            onChange={(e) => setDraft({ ...draft, prefixes: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fee (CAD)</Label>
          <Input
            className="w-24"
            inputMode="decimal"
            value={draft.fee}
            onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const prefixes = draft.prefixes
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
            if (!draft.name.trim() || prefixes.length === 0) {
              toast.error("An area needs a name and at least one postal code start.");
              return;
            }
            upsert.mutate({
              name: draft.name.trim(),
              postal_prefixes: prefixes,
              fee_cents: Math.round((Number(draft.fee) || 0) * 100),
              active: true,
              sort_order: zones.length + 1,
            });
            setDraft({ name: "", prefixes: "", fee: "" });
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add area
        </Button>
      </div>
    </section>
  );
}
