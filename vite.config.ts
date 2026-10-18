// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: { preset: process.env["VERCEL"] ? "vercel" : "cloudflare-module" },
  vite: {
    server: { allowedHosts: ["terminal.local"] },
    // Isolate this release from previously cached missing asset responses.
    build: { assetsDir: "assets/cake-gallery" },
    resolve: {
      alias: {
        "@/integrations/supabase/client": new URL(
          "./src/lib/sites-supabase-client.ts",
          import.meta.url,
        ).pathname,
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
