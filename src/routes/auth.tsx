import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import face from "@/assets/doraemon-face.png";
import body from "@/assets/doraemon-body.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Doraemon" },
      { name: "description", content: "Sign in to save your Doraemon chats." },
      { property: "og:title", content: "Sign in — Doraemon" },
      { property: "og:description", content: "Sign in to save your Doraemon chats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/chat", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/chat" },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) toast.error(String((result.error as Error).message ?? result.error));
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      <img
        src={face}
        alt=""
        aria-hidden
        className="watermark pointer-events-none absolute w-[130vmin] max-w-none"
      />
      <div className="glass-strong relative w-full max-w-sm rounded-3xl p-7">
        <div className="flex flex-col items-center text-center">
          <img
            src={body}
            alt="Doraemon"
            width={1024}
            height={1024}
            className="size-24 rounded-lg object-contain"
          />
          <h1 className="mt-3 font-display text-3xl font-bold">Doraemon</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "in"
              ? "Welcome back! Sign in to continue."
              : "Create an account to save your chats."}
          </p>
        </div>
        <div className="mt-6 space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={oauth}
            className="glass w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Continue with Google
          </Button>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            aria-label="Email"
            autoComplete="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            aria-label="Password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-collar px-4 py-3 text-sm font-bold text-destructive-foreground transition-opacity disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "in" ? "New here? " : "Already have an account? "}
          <Button
            variant="link"
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="h-auto p-0 font-semibold text-bell"
          >
            {mode === "in" ? "Create account" : "Sign in"}
          </Button>
        </p>
      </div>
    </main>
  );
}
