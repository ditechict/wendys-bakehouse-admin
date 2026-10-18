import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { adminListProducts, adminSaveCategory } from "@/lib/admin.functions";
import { categoryImage } from "@/lib/shop";
import { SmartImage } from "@/components/site/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Catalog = Awaited<ReturnType<typeof adminListProducts>>;
type CategoryRow = Catalog["categories"][number];

type Draft = {
  id?: string;
  slug: string;
  name: string;
  blurb: string;
  image_url: string;
  visible: boolean;
  sort_order: number;
};

function toDraft(c?: CategoryRow): Draft {
  return {
    ...(c ? { id: c.id } : {}),
    slug: c?.slug ?? "",
    name: c?.name ?? "",
    blurb: c?.blurb ?? "",
    image_url: c?.image_url ?? "",
    visible: c?.visible ?? true,
    sort_order: c?.sort_order ?? 0,
  };
}

export function AdminCategories() {
  const listProducts = useServerFn(adminListProducts);
  const saveCategory = useServerFn(adminSaveCategory);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listProducts(),
  });

  const [draft, setDraft] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) =>
      saveCategory({
        data: {
          ...(d.id ? { id: d.id } : {}),
          slug: d.slug.trim(),
          name: d.name.trim(),
          blurb: d.blurb.trim(),
          image_url: d.image_url.trim() || null,
          visible: d.visible,
          sort_order: d.sort_order,
        },
      }),
    onSuccess: () => {
      toast.success("Collection saved.");
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-[1rem]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[1rem] border border-border p-6">
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Could not load collections."}
        </p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const categories = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);
  const countFor = (id: string) => data.products.filter((p) => p.category_id === id).length;

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setDraft(toDraft())}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New collection
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-[1rem] border border-border bg-card">
              <SmartImage
                src={categoryImage(c, data.products.filter((p) => p.status === "available"))}
                alt={c.name}
                fit="contain"
                background="white"
              />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg">{c.name}</h2>
                  <Badge variant={c.visible ? "secondary" : "outline"}>
                    {c.visible ? "Visible" : "Hidden"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.blurb || "No blurb yet."}</p>
                <p className="text-xs text-muted-foreground">
                  /{c.slug} · {countFor(c.id)} products · order {c.sort_order}
                </p>
                <Button size="sm" variant="outline" onClick={() => setDraft(toDraft(c))}>
                  Edit
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {draft.id ? "Edit collection" : "New collection"}
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate(draft);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Name</Label>
                    <Input
                      id="cat-name"
                      required
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-slug">Slug</Label>
                    <Input
                      id="cat-slug"
                      required
                      value={draft.slug}
                      onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-blurb">Blurb</Label>
                  <Textarea
                    id="cat-blurb"
                    rows={3}
                    value={draft.blurb}
                    onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-image">Image URL</Label>
                  <Input
                    id="cat-image"
                    value={draft.image_url}
                    onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the first available product photograph in this collection.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cat-order">Sort order</Label>
                    <Input
                      id="cat-order"
                      type="number"
                      min={0}
                      value={draft.sort_order}
                      onChange={(e) =>
                        setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <input
                      id="cat-visible"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={draft.visible}
                      onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
                    />
                    <Label htmlFor="cat-visible">Visible on the site</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : "Save collection"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
