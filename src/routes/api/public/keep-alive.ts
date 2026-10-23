import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { BACKEND_URL } from "@/routes/api/chat";

// Scheduled ping that keeps the Render chat server from going to sleep.
export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const res = await fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(25000) });
          return Response.json({ ok: true, status: res.status });
        } catch {
          return Response.json({ ok: false });
        }
      },
    },
  },
});
