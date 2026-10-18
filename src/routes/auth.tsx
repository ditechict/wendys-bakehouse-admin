import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section } from "@/components/site/Bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const TITLE = "Staff sign in — Wendy's Bakehouse";
const DESC = "Sign in to manage orders, payments and the Wendy's Bakehouse menu.";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { recovery?: boolean } => ({
    recovery: s["recovery"] === "1" || s["recovery"] === 1,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && active) {
        setMode("reset");
        setVerified(true);
      }
    });
    if (search.recovery) {
      setMode("reset");
      supabase.auth.getUser().then(({ data, error }) => {
        if (active) setVerified(!error && !!data.user);
      });
    }
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [search.recovery]);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        if (cooldown) return;
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?recovery=1`,
        });
        setCooldown(60);
        toast.success("If this account can receive recovery emails, a reset link will be sent.");
      } else if (mode === "reset") {
        if (!verified)
          throw new Error("This recovery link is expired or invalid. Request a new link.");
        if (password.length < 12) throw new Error("Use at least 12 characters.");
        if (password !== confirm) throw new Error("The passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setPassword("");
        setConfirm("");
        setVerified(false);
        setMode("login");
        await navigate({ to: "/auth", search: { recovery: false }, replace: true });
        toast.success("Password updated. Sign in with your new password.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await navigate({ to: "/admin" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to complete this request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="Staff"
        title={
          mode === "login"
            ? "Sign in to the bakery dashboard."
            : mode === "forgot"
              ? "Recover your account."
              : "Set a new password."
        }
      />
      <Section>
        <form className="max-w-sm space-y-5" onSubmit={submit}>
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          {mode === "reset" && !verified && (
            <p role="status">
              Use a valid recovery link from your email. If it has expired, request a new link.
            </p>
          )}
          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "reset" ? "new-password" : "current-password"}
                minLength={mode === "reset" ? 12 : undefined}
                disabled={mode === "reset" && !verified}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {mode === "reset" && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                disabled={!verified}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={
              busy || (mode === "forgot" && cooldown > 0) || (mode === "reset" && !verified)
            }
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "forgot"
                  ? cooldown
                    ? `Wait ${cooldown}s`
                    : "Send reset link"
                  : "Update password"}
          </Button>
          <Button
            type="button"
            variant="link"
            disabled={busy}
            onClick={() => {
              setMode(mode === "login" ? "forgot" : mode === "reset" ? "forgot" : "login");
              setPassword("");
              setConfirm("");
            }}
          >
            {mode === "login"
              ? "Forgot password?"
              : mode === "reset"
                ? "Request a new recovery link"
                : "Back to sign in"}
          </Button>
        </form>
      </Section>
    </>
  );
}
