import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FolderTree,
  Cake,
  DollarSign,
  MessageSquareHeart,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Bakehouse dashboard — Wendy's Bakehouse" },
      { name: "description", content: "Manage orders, payments, products and shop settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/pricing", label: "Pricing", icon: DollarSign },
  { to: "/admin/products", label: "Products", icon: Cake },
  { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquareHeart },
  { to: "/admin/categories", label: "Collections", icon: FolderTree },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">Dashboard</p>
          <h1 className="font-display text-3xl sm:text-4xl">Wendy&rsquo;s Bakehouse admin</h1>
        </div>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <div className="mt-8 gap-8 md:flex">
        <nav
          aria-label="Admin sections"
          className="-mx-1 mb-6 flex gap-2 overflow-x-auto pb-2 md:mx-0 md:mb-0 md:w-52 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
        >
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest ? rest.exact : false }}
              className="flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
