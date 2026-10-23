import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: thread } = await context.supabase.from("threads").select("id").eq("id", data.id).maybeSingle();
    if (!thread) return { found: false, messages: "[]" };
    const { data: rows, error } = await context.supabase
      .from("messages")
      .select("message_id,role,parts")
      .eq("thread_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const messages = (rows ?? []).map((r) => ({
      id: r.message_id,
      role: r.role,
      parts: r.parts,
    }));
    return { found: true, messages: JSON.stringify(messages) };
  });
