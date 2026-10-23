import { useState } from "react";
import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import body from "@/assets/doraemon-body.png";

export function ChatLoadError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await router.invalidate();
      reset();
    } catch {
      // Keep the recovery view visible if the connection is still unavailable.
    } finally {
      setRetrying(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <img
        src={body}
        alt="Doraemon"
        width={1024}
        height={1024}
        className="size-20 rounded-lg object-contain"
      />
      <h1 className="font-display text-2xl font-semibold">Couldn't load your chat</h1>
      <p role="alert" className="max-w-sm text-sm text-muted-foreground">
        Your saved chats are still there. Check your connection and try again.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => void retry()} disabled={retrying} className="bg-send rounded-full">
          <RefreshCw className={retrying ? "motion-safe:animate-spin" : ""} />
          {retrying ? "Trying again…" : "Try again"}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
