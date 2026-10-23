import { describe, expect, it } from "vitest";
import { createChatTurnGate } from "@/lib/chat-turn";

describe("Sequential chat turns", () => {
  it("accepts one user message and rejects duplicate submissions before status updates", () => {
    const gate = createChatTurnGate();
    expect(gate.acquire("ready")).toBe(true);
    expect(gate.acquire("ready")).toBe(false);
    gate.release();
    expect(gate.acquire("ready")).toBe(true);
  });

  it.each(["submitted", "streaming"])("blocks new user messages while Doraemon is %s", (status) => {
    expect(createChatTurnGate().acquire(status)).toBe(false);
  });
});