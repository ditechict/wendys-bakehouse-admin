import { createFileRoute } from "@tanstack/react-router";
import { AdminPricing } from "@/components/admin/AdminPricing";
export const Route = createFileRoute("/_authenticated/admin/pricing")({ component: AdminPricing });
