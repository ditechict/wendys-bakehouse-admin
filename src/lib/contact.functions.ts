import { createServerFn } from "@tanstack/react-start";
import { BUSINESS } from "@/data/catalog";

/** Read only the public contact field; never expose payment settings. */
export const getShopContact = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return { phone: BUSINESS.phoneE164 };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("whatsapp_number")
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000))
      .maybeSingle();
    if (error) return { phone: BUSINESS.phoneE164 };
    const phone = String(data?.whatsapp_number ?? "").replace(/\D/g, "");
    return { phone: /^\d{8,15}$/.test(phone) ? phone : BUSINESS.phoneE164 };
  } catch {
    return { phone: BUSINESS.phoneE164 };
  }
});
