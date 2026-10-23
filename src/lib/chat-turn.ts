/** Prevent rapid clicks, Enter presses and suggestions from opening concurrent turns. */
export function createChatTurnGate() {
  let active = false;
  return {
    acquire(status: string) {
      if (active || status === "submitted" || status === "streaming") return false;
      active = true;
      return true;
    },
    release() {
      active = false;
    },
  };
}