import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useVoiceReadout() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(
    () => () => {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        window.speechSynthesis?.cancel();
      }
    },
    [],
  );

  function read(id: string, text: string) {
    if (!("speechSynthesis" in window)) {
      toast.error("Voice readout isn't supported in this browser.");
      return;
    }
    const previous = utteranceRef.current;
    if (previous) {
      previous.onend = null;
      previous.onerror = null;
    }
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || "en-US";
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeakingId(null);
    };
    utterance.onerror = (event) => {
      utteranceRef.current = null;
      setSpeakingId(null);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        toast.error("Voice readout couldn't play. Please try again.");
      }
    };
    utteranceRef.current = utterance;
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }

  return { speakingId, read };
}
