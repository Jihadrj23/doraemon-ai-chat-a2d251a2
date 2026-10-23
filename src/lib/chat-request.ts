import type { UIMessage } from "ai";

// The Python backend consumes only the current turn, not previous messages.
export function currentTurnMessages(messages: UIMessage[]): UIMessage[] {
  const last = messages.at(-1);
  return last ? [last] : [];
}