import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICE = "Puck";
const STYLE =
  "Say this in a cheerful, warm, slightly high-pitched and playful cartoon robot-cat voice, friendly and energetic: ";

export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await sb.auth.getUser(token);
        if (error || !data.user) return new Response("Unauthorized", { status: 401 });

        const { text } = (await request.json().catch(() => ({}))) as { text?: string };
        const input = (text ?? "").trim().slice(0, 4000);
        if (!input) return new Response("Bad request", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            contents: [{ role: "user", parts: [{ text: STYLE + input }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
            },
            stream_format: "audio",
          }),
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "audio/wav",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
