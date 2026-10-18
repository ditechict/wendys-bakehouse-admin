import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

declare global {
  var __WENDY_PUBLIC__: { url: string; publishableKey: string } | undefined;
}
let client: ReturnType<typeof createClient<Database>> | undefined;
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop) {
    if (!client) {
      const cfg = globalThis.__WENDY_PUBLIC__;
      const url = cfg?.url || import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
      const key =
        cfg?.publishableKey ||
        import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["SUPABASE_PUBLISHABLE_KEY"];
      if (!url || !key) throw new Error("Supabase public configuration is missing.");
      client = createClient<Database>(url, key, {
        global: {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
              headers.delete("Authorization");
            headers.set("apikey", key);
            return fetch(input, { ...init, headers });
          },
        },
      });
    }
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
