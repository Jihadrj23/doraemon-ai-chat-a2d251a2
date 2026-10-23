import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { currentTurnMessages } from "@/lib/chat-request";

describe("Current-turn transport", () => {
  it("does not reupload historical attachments with a new chat turn", () => {
    const old: UIMessage = { id: "old", role: "user", parts: [{ type: "file", mediaType: "image/png", url: "data:image/png;base64,old" }] };
    const current: UIMessage = { id: "new", role: "user", parts: [{ type: "text", text: "Hello" }, { type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,current" }] };
    expect(currentTurnMessages([old, current])).toEqual([current]);
    expect(currentTurnMessages([])).toEqual([]);
  });
});