import { createFileRoute, redirect } from "@tanstack/react-router";
import { createThread, listThreads } from "@/lib/chat.functions";
import { ChatLoadError } from "@/components/chat-load-error";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Your chats — Doraemon" },
      { name: "description", content: "Start a conversation with Doraemon." },
      { property: "og:title", content: "Your chats — Doraemon" },
      { property: "og:description", content: "Start a conversation with Doraemon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async () => {
    const threads = await listThreads();
    const id = threads[0]?.id ?? (await createThread()).id;
    throw redirect({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
  },
  errorComponent: ChatLoadError,
});
