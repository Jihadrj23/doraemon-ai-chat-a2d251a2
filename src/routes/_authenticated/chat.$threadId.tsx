import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  History,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Plus,
  SquarePen,
  Trash2,
  ArrowUp,
  Paperclip,
  Volume2,
  Square,
} from "lucide-react";

import face from "@/assets/doraemon-face.png";
import body from "@/assets/doraemon-body.png";
import { Button } from "@/components/ui/button";
import { ChatLoadError } from "@/components/chat-load-error";
import { useVoiceReadout } from "@/hooks/use-voice-readout";
import { supabase } from "@/integrations/supabase/client";
import { createThread, deleteThread, getThreadMessages, listThreads } from "@/lib/chat.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createChatTurnGate } from "@/lib/chat-turn";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Doraemon" },
      { name: "description", content: "Your conversation with Doraemon." },
      { property: "og:title", content: "Chat — Doraemon" },
      { property: "og:description", content: "Your conversation with Doraemon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => getThreadMessages({ data: { id: params.threadId } }),
  component: ChatPage,
  errorComponent: ChatLoadError,
});

const SUGGESTIONS = [
  "Plan a fun weekend for me",
  "Explain black holes simply",
  "Help me write a kind message",
  "Which gadget would fix my homework?",
];

function ChatPage() {
  const { threadId } = Route.useParams();
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => listThreads() });

  useEffect(() => {
    if (!initial.found) navigate({ to: "/chat", replace: true });
  }, [initial.found, navigate]);

  async function newChat() {
    try {
      const { id } = await createThread();
      await qc.invalidateQueries({ queryKey: ["threads"] });
      setHistoryOpen(false);
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeThread(id: string) {
    await deleteThread({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["threads"] });
    if (id === threadId) navigate({ to: "/chat" });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* Watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <img src={face} alt="" className="watermark w-[110vmin] max-w-[820px]" />
      </div>

      <header className="glass-strong relative z-10 flex items-center justify-between border-x-0 border-t-0 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={body}
            alt="Doraemon"
            width={1024}
            height={1024}
            className="size-12 rounded-lg object-contain"
          />
          <span className="font-display text-xl font-semibold">Doraemon</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          title="Open menu"
          onClick={() => setHistoryOpen(true)}
          className="size-11 rounded-full text-foreground [&_svg]:size-6"
        >
          <Menu />
        </Button>
      </header>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          className="glass-strong flex w-[min(340px,88vw)] flex-col border-l p-5"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-3 font-display text-xl">
              <img
                src={body}
                alt=""
                loading="lazy"
                width={1024}
                height={1024}
                className="size-12 rounded-lg object-contain"
              />{" "}
              Doraemon
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <Button
              onClick={newChat}
              className="bg-send h-12 w-full justify-start rounded-lg px-4 font-semibold"
            >
              <SquarePen /> New Chat
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowHistory((value) => !value)}
              aria-expanded={showHistory}
              className="h-12 w-full justify-start rounded-lg px-4"
            >
              <History /> Chat History
            </Button>
          </div>
          <nav aria-label="Chat history" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {showHistory &&
              (threads.isPending ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Loading chats…</p>
              ) : threads.isError ? (
                <p className="px-4 py-3 text-sm text-collar">Couldn't load chats.</p>
              ) : threads.data?.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No chats yet.</p>
              ) : (
                threads.data?.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "group flex items-center rounded-lg hover:bg-accent",
                      t.id === threadId && "bg-accent",
                    )}
                  >
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: t.id }}
                      onClick={() => setHistoryOpen(false)}
                      className="min-w-0 flex-1 truncate px-4 py-3 text-sm"
                    >
                      {t.title}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete chat"
                      title="Delete chat"
                      onClick={() =>
                        removeThread(t.id).catch((error: Error) => toast.error(error.message))
                      }
                      className="mr-1 text-muted-foreground hover:text-collar"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 border-t border-glass-border pt-4">
            <img
              src={body}
              alt="JIHAD avatar"
              loading="lazy"
              width={1024}
              height={1024}
              className="size-11 rounded-lg object-contain"
            />
            <span className="flex-1 text-sm font-bold">JIHAD</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              title="Sign out"
              onClick={signOut}
              className="text-muted-foreground"
            >
              <LogOut />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {initial.found && (
        <ChatWindow
          key={threadId}
          threadId={threadId}
          initialMessages={JSON.parse(initial.messages) as UIMessage[]}
        />
      )}
    </div>
  );
}

function ChatWindow({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: UIMessage[];
}) {
  const qc = useQueryClient();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );

  const { speakingId, read } = useVoiceReadout();
  const readRef = useRef(read);
  readRef.current = read;

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Something went wrong"),
    onFinish: ({ message, isAbort, isError }) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (isAbort || isError || message.role !== "assistant") return;
      const text = message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("\n")
        .trim();
      if (text) void readRef.current(message.id, text);
    },
  });
  const busy = status === "submitted" || status === "streaming";

  // Wake the chat server as soon as the chat opens, so the first reply is faster.
  useEffect(() => {
    void fetch("https://doraemon-backend-ar3j.onrender.com/", { mode: "no-cors" }).catch(() => {});
  }, []);
  const turnGate = useRef(createChatTurnGate());

  function handleSubmit(msg: PromptInputMessage) {
    const text = msg.text.trim();
    if ((!text && msg.files.length === 0) || !turnGate.current.acquire(status)) {
      throw new Error("A turn is already in progress or the message is empty.");
    }
    void sendMessage({ text, files: msg.files }).finally(() => turnGate.current.release());
  }

  return (
    <PromptInputProvider>
      <Conversation className="relative z-0 min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl flex-col gap-5 px-4 pt-6 pb-28">
          {messages.length === 0 ? (
            <EmptyState onPick={(text) => handleSubmit({ text, files: [] })} />
          ) : (
            messages.map((m) => (
              <Message
                from={m.role}
                key={m.id}
                data-message-role={m.role}
                className={cn("shrink-0", m.role === "user" ? "items-end" : "mr-auto items-start")}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <img
                      src={body}
                      alt=""
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="size-8 rounded object-contain"
                    />{" "}
                    Doraemon
                  </div>
                )}
                <MessageContent
                  className={cn(
                    "glass rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words",
                    "group-[.is-user]:bg-glass group-[.is-user]:text-foreground group-[.is-user]:rounded-br-md group-[.is-user]:border-primary/40",
                    "group-[.is-assistant]:rounded-tl-md",
                  )}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text")
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    if (part.type === "file" && part.mediaType?.startsWith("image/"))
                      return (
                        <img
                          key={i}
                          src={part.url}
                          alt={part.filename ?? "attachment"}
                          className="max-h-56 rounded-xl"
                        />
                      );
                    if (part.type === "file" && part.mediaType?.startsWith("audio/"))
                      return (
                        <div key={i} className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">🎵 {part.filename}</span>
                          <audio controls src={part.url} className="max-w-full" />
                        </div>
                      );
                    if (part.type === "file")
                      return (
                        <span key={i} className="text-xs text-muted-foreground">
                          {part.mediaType === "application/pdf" ? "📕" : "📄"} {part.filename ?? "file"}
                        </span>
                      );
                    return null;
                  })}
                </MessageContent>
                {m.role === "assistant" &&
                  !busy &&
                  m.parts.some((part) => part.type === "text" && part.text.trim()) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={speakingId === m.id ? "Stop readout" : "Read aloud"}
                      title={speakingId === m.id ? "Stop readout" : "Read aloud"}
                      onClick={() =>
                        read(
                          m.id,
                          m.parts
                            .filter((part) => part.type === "text")
                            .map((part) => part.text)
                            .join("\n"),
                        )
                      }
                      className={cn("text-muted-foreground", speakingId === m.id && "text-bell")}
                    >
                      {speakingId === m.id ? <Square /> : <Volume2 />}
                    </Button>
                  )}
              </Message>
            ))
          )}
          {status === "submitted" && <WaitingIndicator />}
        </ConversationContent>
        <ConversationScrollButton className="bottom-24" />
      </Conversation>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-3xl">
          <PromptInput
            onSubmit={handleSubmit}
            accept="image/*,audio/*,application/pdf,.pdf,.doc,.docx,.txt,.rtf,.odt,.csv,.xls,.xlsx,.ppt,.pptx,.md,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            maxFiles={5}
            maxFileSize={10 * 1024 * 1024}
            onError={(e) =>
              toast.error(
                e.code === "max_file_size"
                  ? "Each file must be 10 MB or smaller."
                  : e.code === "max_files"
                    ? "You can attach up to 5 files."
                    : "Only photos, audio, PDF and document files are supported.",
              )
            }
            className="glass-strong relative rounded-[1.75rem] shadow-2xl [&_[data-slot=input-group]]:min-h-14 [&_[data-slot=input-group]]:rounded-[1.75rem] [&_[data-slot=input-group]]:border-glass-border [&_[data-slot=input-group]]:bg-transparent"
          >
            <PromptInputTextarea
              placeholder="Ask Doraemon anything..."
              autoFocus
              aria-label="Message Doraemon"
              className="min-h-14 max-h-36 py-4 pr-24 pl-12 text-sm placeholder:text-muted-foreground"
            />
            <PromptInputFooter className="pointer-events-none absolute inset-x-0 bottom-0 h-14 items-center px-2 py-2">
              <PromptInputTools className="pointer-events-auto">
                <AttachButton />
              </PromptInputTools>
              <div className="pointer-events-auto flex items-center gap-1">
                <VoiceButton />
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  title={busy ? "Stop response" : "Send message"}
                  className="bg-send size-10 rounded-full text-primary-foreground hover:opacity-90"
                >
                  {busy ? undefined : <ArrowUp className="size-5" />}
                </PromptInputSubmit>
              </div>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </PromptInputProvider>
  );
}

function AttachButton() {
  const att = usePromptInputAttachments();
  return (
    <PromptInputButton
      tooltip="Add attachment"
      aria-label="Add attachment"
      onClick={() => att.openFileDialog()}
      className="size-10 rounded-full text-foreground/80 hover:text-bell"
    >
      {att.files.length > 0 ? (
        <span className="flex items-center gap-1 text-xs font-bold text-bell">
          <Paperclip className="size-4" />
          {att.files.length}
        </span>
      ) : (
        <Plus className="size-5" />
      )}
    </PromptInputButton>
  );
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
  start: () => void;
  stop: () => void;
};

function VoiceButton() {
  const { textInput } = usePromptInputController();
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const baseRef = useRef("");

  useEffect(
    () => () => {
      const rec = recRef.current;
      if (rec) {
        rec.onresult = () => {};
        rec.onend = () => {};
        rec.onerror = () => {};
        rec.stop();
      }
    },
    [],
  );

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const W = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    baseRef.current = textInput.value ? textInput.value + " " : "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i]?.[0]?.transcript ?? "";
      textInput.setInput(baseRef.current + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast.error("Voice input couldn't start. Check microphone permission.");
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      toast.error("Voice input couldn't start. Please try again.");
    }
  }

  return (
    <PromptInputButton
      tooltip={listening ? "Stop voice input" : "Voice input"}
      aria-label={listening ? "Stop voice input" : "Voice input"}
      onClick={toggle}
      className={cn(
        "size-10 rounded-full text-foreground/80 hover:text-bell",
        listening && "bg-collar text-destructive-foreground motion-safe:animate-pulse",
      )}
    >
      {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
    </PromptInputButton>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <img
        src={body}
        alt="Doraemon"
        width={1024}
        height={1024}
        className="size-28 rounded-lg object-contain"
      />
      <h2 className="mt-4 font-display text-3xl font-bold">Hi, I'm Doraemon!</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        What can I pull out of my 4D pocket for you today?
      </p>
      <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <Button
            variant="ghost"
            key={s}
            onClick={() => onPick(s)}
            className="glass h-auto min-h-14 whitespace-normal rounded-lg px-4 py-3 text-left text-sm transition-all hover:border-bell/50 hover:text-bell"
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}

function WaitingIndicator() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const label =
    seconds < 8
      ? "Doraemon is searching his pocket…"
      : seconds < 30
        ? "Waking Doraemon up… the first reply can take a few minutes"
        : "Almost there… thanks for waiting";
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm">
      <div className="relative size-9 shrink-0">
        <span className="absolute inset-0 rounded-full border-2 border-muted border-t-primary motion-safe:animate-spin" />
        <img src={body} alt="" width={1024} height={1024} className="absolute inset-1 size-7 rounded object-contain" />
      </div>
      <div className="flex flex-col">
        <Shimmer>{label}</Shimmer>
        {seconds >= 3 && <span className="text-xs text-muted-foreground">{seconds}s</span>}
      </div>
    </div>
  );
}
