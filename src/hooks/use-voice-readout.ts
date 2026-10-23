import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useVoiceReadout() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  function stopAll() {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  useEffect(() => () => stopAll(), []);

  async function read(id: string, text: string) {
    const wasThis = speakingId === id;
    stopAll();
    if (wasThis) {
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(
          res.status === 402
            ? "Out of AI credits for voice readout."
            : res.status === 429
              ? "Too many voice requests. Please wait a moment."
              : msg.slice(0, 160) || "Voice readout couldn't play.",
        );
      }
      const blob = await res.blob();
      if (ctrl.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        stopAll();
        setSpeakingId(null);
      };
      await audio.play();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      stopAll();
      setSpeakingId(null);
      if ((e as Error).name === "NotAllowedError") {
        toast.message("Tap the speaker button to hear Doraemon.");
      } else {
        toast.error((e as Error).message);
      }
    }
  }

  return { speakingId, read };
}
