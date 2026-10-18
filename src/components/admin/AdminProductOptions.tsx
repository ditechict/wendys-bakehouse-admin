import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  adminDeleteOptionChoice,
  adminDeleteOptionGroup,
  adminListOptions,
  adminSaveOptionChoice,
  adminSaveOptionGroup,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isCustomCakeOptionGroup,
  isCustomCakeProduct,
  isCustomCakeRuleGroup,
} from "@/lib/custom-cake-contract";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toCents(value: string): number {
  const n = Number(value.trim());
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Choice keys stay stable once saved, so historical orders keep meaning even
 * when the visible label is reworded later.
 */
export function AdminProductOptions({ productId }: { productId: string }) {
  const listOptions = useServerFn(adminListOptions);
  const saveGroup = useServerFn(adminSaveOptionGroup);
  const deleteGroup = useServerFn(adminDeleteOptionGroup);
  const saveChoice = useServerFn(adminSaveOptionChoice);
  const deleteChoice = useServerFn(adminDeleteOptionChoice);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["admin", "options", productId],
    queryFn: () => listOptions({ data: { product_id: productId } }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "options", productId] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const onError = (e: Error) => toast.error(e.message);

  const groupMutation = useMutation({
    mutationFn: (input: {
      id?: string;
      key: string;
      label: string;
      required: boolean;
      allow_multiple: boolean;
      available: boolean;
      sort_order: number;
    }) => saveGroup({ data: { ...input, product_id: productId } }),
    onSuccess: invalidate,
    onError,
  });
  const groupDelete = useMutation({
    mutationFn: (id: string) => deleteGroup({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });
  const choiceMutation = useMutation({
    mutationFn: (input: {
      id?: string;
      group_id: string;
      key: string;
      label: string;
      price_delta_cents: number;
      available: boolean;
      sort_order: number;
    }) => saveChoice({ data: input }),
    onSuccess: invalidate,
    onError,
  });
  const choiceDelete = useMutation({
    mutationFn: (id: string) => deleteChoice({ data: { id } }),
    onSuccess: invalidate,
    onError,
  });

  const [newGroup, setNewGroup] = useState("");
  const [newChoice, setNewChoice] = useState<Record<string, { label: string; price: string }>>({});

  if (isPending) return <Skeleton className="h-40 w-full rounded-[1rem]" />;

  const groups = data?.groups ?? [];
  const choices = data?.choices ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choices customers pick when ordering. The amount is added to the product price.
      </p>

      {groups.map((g) => {
        const mine = choices.filter((c) => c.group_id === g.id);
        const draft = newChoice[g.id] ?? { label: "", price: "" };
        const protectedGroup = isCustomCakeRuleGroup(g.id);
        const protectedChoices = isCustomCakeOptionGroup(g.id);
        return (
          <div key={g.id} className="rounded-[0.75rem] border border-border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="max-w-[200px]"
                defaultValue={g.label}
                onBlur={(e) =>
                  groupMutation.mutate({
                    id: g.id,
                    key: g.key,
                    label: e.target.value,
                    required: g.required,
                    allow_multiple: g.allow_multiple,
                    available: g.available,
                    sort_order: g.sort_order,
                  })
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={g.required}
                  disabled={protectedGroup}
                  onCheckedChange={(v) =>
                    groupMutation.mutate({
                      id: g.id,
                      key: g.key,
                      label: g.label,
                      required: v,
                      allow_multiple: g.allow_multiple,
                      available: g.available,
                      sort_order: g.sort_order,
                    })
                  }
                />
                Must choose
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={g.allow_multiple}
                  disabled={protectedGroup}
                  onCheckedChange={(v) =>
                    groupMutation.mutate({
                      id: g.id,
                      key: g.key,
                      label: g.label,
                      required: g.required,
                      allow_multiple: v,
                      available: g.available,
                      sort_order: g.sort_order,
                    })
                  }
                />
                Multiple choices
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={g.available}
                  disabled={protectedGroup}
                  onCheckedChange={(v) =>
                    groupMutation.mutate({
                      id: g.id,
                      key: g.key,
                      label: g.label,
                      required: g.required,
                      allow_multiple: g.allow_multiple,
                      available: v,
                      sort_order: g.sort_order,
                    })
                  }
                />
                Shown
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="ml-auto text-destructive"
                aria-label={`Remove ${g.label}`}
                disabled={protectedChoices}
                onClick={() => {
                  if (confirm(`Remove "${g.label}" and its choices?`)) groupDelete.mutate(g.id);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {protectedChoices && (
              <p className="mt-2 text-xs text-muted-foreground">
                Custom-cake pricing option. Labels, prices and sold-out choices may change; its
                choice list is protected.
              </p>
            )}

            <ul className="mt-3 space-y-2">
              {mine.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-[200px]"
                    defaultValue={c.label}
                    onBlur={(e) =>
                      choiceMutation.mutate({
                        id: c.id,
                        group_id: g.id,
                        key: c.key,
                        label: e.target.value,
                        price_delta_cents: c.price_delta_cents,
                        available: c.available,
                        sort_order: c.sort_order,
                      })
                    }
                  />
                  <div className="flex items-center gap-1 text-sm">
                    <span aria-hidden="true">+$</span>
                    <Input
                      className="w-24"
                      inputMode="decimal"
                      aria-label={`Extra cost for ${c.label}`}
                      defaultValue={(c.price_delta_cents / 100).toString()}
                      readOnly
                      title="Edit adjustments in Admin → Pricing"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={c.available}
                      onCheckedChange={(v) =>
                        choiceMutation.mutate({
                          id: c.id,
                          group_id: g.id,
                          key: c.key,
                          label: c.label,
                          price_delta_cents: c.price_delta_cents,
                          available: v,
                          sort_order: c.sort_order,
                        })
                      }
                    />
                    Available
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Remove ${c.label}`}
                    disabled={protectedChoices}
                    onClick={() => choiceDelete.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>

            {!protectedChoices && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">New choice</Label>
                  <Input
                    className="max-w-[200px]"
                    placeholder="10 inch"
                    value={draft.label}
                    onChange={(e) =>
                      setNewChoice({ ...newChoice, [g.id]: { ...draft, label: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Extra cost (CAD)</Label>
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.price}
                    onChange={(e) =>
                      setNewChoice({ ...newChoice, [g.id]: { ...draft, price: e.target.value } })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const key = slugify(draft.label);
                    if (!key) {
                      toast.error("Give the choice a name first.");
                      return;
                    }
                    choiceMutation.mutate({
                      group_id: g.id,
                      key,
                      label: draft.label.trim(),
                      price_delta_cents: toCents(draft.price || "0"),
                      available: true,
                      sort_order: mine.length + 1,
                    });
                    setNewChoice({ ...newChoice, [g.id]: { label: "", price: "" } });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add choice
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {!isCustomCakeProduct(productId) && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">New option group</Label>
            <Input
              className="max-w-[220px]"
              placeholder="Cake size"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const key = slugify(newGroup);
              if (!key) {
                toast.error("Give the group a name first.");
                return;
              }
              groupMutation.mutate({
                key,
                label: newGroup.trim(),
                required: true,
                allow_multiple: false,
                available: true,
                sort_order: groups.length + 1,
              });
              setNewGroup("");
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add group
          </Button>
        </div>
      )}
    </div>
  );
}
