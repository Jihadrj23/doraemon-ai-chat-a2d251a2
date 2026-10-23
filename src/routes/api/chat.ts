import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";

export const BACKEND_URL = "https://doraemon-backend-ar3j.onrender.com";

type BackendFile = { name: string; type: string; data: string };

function filesOf(m: UIMessage | undefined): BackendFile[] {
  if (!m) return [];
  return m.parts.flatMap((p) => {
    if (p.type !== "file" || !p.url?.startsWith("data:")) return [];
    const comma = p.url.indexOf(",");
    return [{ name: p.filename ?? "file", type: p.mediaType, data: p.url.slice(comma + 1) }];
  });
}

async function askBackend(message: string, files: BackendFile[] = []): Promise<string> {
  try {
    // Files go as base64 in `files: [{name, type, data}]`; old backends just ignore the field.
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, files }),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | string | null;
    if (!res.ok) {
      console.error("backend error", res.status, data);
      return "Doraemon's backend had a problem answering. Please try again in a moment.";
    }
    if (typeof data === "string") return data;
    const v = data?.['reply'] ?? data?.['response'] ?? data?.['answer'] ?? data?.['message'] ?? data?.['text'];
    return typeof v === "string" && v.trim() ? v : JSON.stringify(data);
  } catch (e) {
    console.error("backend unreachable", e);
    return "Couldn't reach Doraemon's backend. Please try again.";
  }
}


function userClient(token: string) {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = userClient(token);
        const { data: userData, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as { messages: UIMessage[]; threadId: string };
        const { messages, threadId } = body;
        if (!Array.isArray(messages) || !threadId) return new Response("Bad request", { status: 400 });

        const { data: thread } = await sb.from("threads").select("id,title").eq("id", threadId).maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          const { error } = await sb.from("messages").upsert(
            { thread_id: threadId, message_id: last.id, role: "user", parts: last.parts as never },
            { onConflict: "thread_id,message_id" },
          );
          if (error) console.error("save user msg", error);
          const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
          if (thread.title === "New chat") patch.title = textOf(last).slice(0, 60) || "New chat";
          await sb.from("threads").update(patch).eq("id", threadId);
        }

        const reply = await askBackend(textOf(last ?? ({ parts: [] } as unknown as UIMessage)), filesOf(last));
        const stream = createUIMessageStream({
          originalMessages: messages,
          generateId: () => crypto.randomUUID(),
          execute: ({ writer }) => {
            const id = crypto.randomUUID();
            writer.write({ type: "text-start", id });
            writer.write({ type: "text-delta", id, delta: reply });
            writer.write({ type: "text-end", id });
          },
          onFinish: async ({ responseMessage }) => {
            const { error } = await sb.from("messages").upsert(
              {
                thread_id: threadId,
                message_id: responseMessage.id,
                role: "assistant",
                parts: responseMessage.parts as never,
              },
              { onConflict: "thread_id,message_id" },
            );
            if (error) console.error("save assistant msg", error);
          },
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
