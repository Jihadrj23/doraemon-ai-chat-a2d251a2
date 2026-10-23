import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatLoadError } from "@/components/chat-load-error";

const { invalidate } = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Chat load recovery", () => {
  it("reloads route data before resetting the failed chat", async () => {
    let resolve: (() => void) | undefined;
    invalidate.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const reset = vi.fn();
    render(<ChatLoadError error={new TypeError("Failed to fetch")} reset={reset} />);
    fireEvent.click(screen.getByRole("button"));
    expect(invalidate).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
    await act(async () => {
      resolve?.();
    });
    expect(reset).toHaveBeenCalledOnce();
  });
});
