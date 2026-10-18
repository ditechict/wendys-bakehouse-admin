import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./sites-supabase-client";

// Use the runtime-configured Sites client for every browser server-function call.
// The generated attacher imports ./client relatively, bypassing the Vite alias.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
